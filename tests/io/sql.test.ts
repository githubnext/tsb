import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import type { SqlConnection } from "../../src/io/sql.ts";
import { readSql, toSql } from "../../src/io/sql.ts";

// ─── mock connection factory ──────────────────────────────────────────────────

/** Creates a simple in-memory mock SQL connection. */
function createMockConn(
  rows: Record<string, unknown>[] = [],
): SqlConnection & { calls: Array<{ sql: string; params: readonly unknown[] }> } {
  const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params: params ?? [] });
      // For table existence checks (SELECT 1 FROM ... WHERE 1=0), throw to indicate non-existence
      if (sql.includes("WHERE 1=0")) {
        throw new Error("table does not exist");
      }
      return rows;
    },
  };
}

describe("readSql", () => {
  it("returns a DataFrame from query results", async () => {
    const conn = createMockConn([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
    const df = await readSql("SELECT * FROM users", conn);
    expect(df.columns.values).toContain("id");
    expect(df.columns.values).toContain("name");
    expect(df.index.size).toBe(2);
    expect(df.col("name").values).toEqual(["Alice", "Bob"]);
  });

  it("returns empty DataFrame for no rows", async () => {
    const conn = createMockConn([]);
    const df = await readSql("SELECT * FROM empty", conn);
    expect(df.index.size).toBe(0);
  });

  it("parses date strings into Date objects by default", async () => {
    const conn = createMockConn([{ dt: "2024-01-15", val: 1 }]);
    const df = await readSql("SELECT * FROM t", conn);
    const dateVal = df.col("dt").values[0];
    expect(dateVal).toBeInstanceOf(Date);
  });

  it("skips date parsing when parseDates=false", async () => {
    const conn = createMockConn([{ dt: "2024-01-15", val: 1 }]);
    const df = await readSql("SELECT * FROM t", conn, { parseDates: false });
    const dateVal = df.col("dt").values[0];
    expect(typeof dateVal).toBe("string");
  });

  it("sets indexCol as the DataFrame index", async () => {
    const conn = createMockConn([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
    const df = await readSql("SELECT * FROM users", conn, { indexCol: "id" });
    expect(df.columns.values).not.toContain("id");
    expect(df.columns.values).toContain("name");
    expect([...df.index.values]).toEqual(["1", "2"]);
  });

  it("passes params to the connection", async () => {
    const conn = createMockConn([{ x: 42 }]);
    await readSql("SELECT * FROM t WHERE id = ?", conn, { params: [1] });
    expect(conn.calls[0]?.params).toEqual([1]);
  });

  it("handles null values in results", async () => {
    const conn = createMockConn([{ a: 1, b: null }]);
    const df = await readSql("SELECT a, b FROM t", conn);
    expect(df.col("b").values[0]).toBeNull();
  });
});

describe("toSql", () => {
  it("creates table and inserts rows", async () => {
    const { DataFrame } = await import("../../src/index.ts");
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });

    const insertedRows: Array<{ sql: string; params: readonly unknown[] }> = [];
    const conn: SqlConnection = {
      async query(sql, params) {
        insertedRows.push({ sql, params: params ?? [] });
        if (sql.includes("WHERE 1=0")) {
          throw new Error("no table");
        }
        return [];
      },
    };

    await toSql(df, "mytable", conn, { ifExists: "replace" });
    const insertCalls = insertedRows.filter((c) => c.sql.includes("INSERT"));
    expect(insertCalls.length).toBe(2);
  });

  it("includes index column when index=true", async () => {
    const { DataFrame } = await import("../../src/index.ts");
    const df = DataFrame.fromColumns({ val: [10, 20, 30] });

    const insertSqls: string[] = [];
    const conn: SqlConnection = {
      async query(sql, params) {
        insertSqls.push(sql);
        if (sql.includes("WHERE 1=0")) throw new Error("no table");
        return [];
      },
    };

    await toSql(df, "t", conn, { ifExists: "replace", index: true });
    const createSql = insertSqls.find((s) => s.startsWith("CREATE"));
    expect(createSql).toContain('"index"');
  });

  it("throws on ifExists=fail when table exists", async () => {
    const { DataFrame } = await import("../../src/index.ts");
    const df = DataFrame.fromColumns({ x: [1] });

    const conn: SqlConnection = {
      async query() {
        return []; // never throws → table "exists"
      },
    };

    await expect(toSql(df, "t", conn, { ifExists: "fail" })).rejects.toThrow();
  });

  it("appends rows when ifExists=append (no DROP/CREATE)", async () => {
    const { DataFrame } = await import("../../src/index.ts");
    const df = DataFrame.fromColumns({ x: [1, 2] });

    const calls: string[] = [];
    const conn: SqlConnection = {
      async query(sql) {
        calls.push(sql);
        return [];
      },
    };

    await toSql(df, "t", conn, { ifExists: "append" });
    expect(calls.some((s) => s.startsWith("DROP"))).toBe(false);
    expect(calls.some((s) => s.startsWith("CREATE"))).toBe(false);
    expect(calls.filter((s) => s.includes("INSERT")).length).toBe(2);
  });

  it("respects chunksize for batch inserts", async () => {
    const { DataFrame } = await import("../../src/index.ts");
    const data = Array.from({ length: 10 }, (_, i) => i);
    const df = DataFrame.fromColumns({ n: data });

    const insertCalls: string[] = [];
    const conn: SqlConnection = {
      async query(sql) {
        if (sql.includes("WHERE 1=0")) throw new Error();
        if (sql.includes("INSERT")) insertCalls.push(sql);
        return [];
      },
    };

    await toSql(df, "t", conn, { ifExists: "replace", chunksize: 3 });
    expect(insertCalls.length).toBe(10);
  });

  // Property: all rows get inserted
  it("property: all rows are inserted exactly once", async () => {
    const { DataFrame } = await import("../../src/index.ts");
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 999 }), { minLength: 0, maxLength: 20 }),
        async (ns) => {
          const df = DataFrame.fromColumns({ n: ns });
          let insertCount = 0;
          const conn: SqlConnection = {
            async query(sql) {
              if (sql.includes("WHERE 1=0")) throw new Error();
              if (sql.includes("INSERT")) insertCount++;
              return [];
            },
          };
          await toSql(df, "t", conn, { ifExists: "replace" });
          expect(insertCount).toBe(ns.length);
        },
      ),
    );
  });
});
