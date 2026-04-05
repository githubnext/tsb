/**
 * Tests for CSV I/O — readCsv and toCsv.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, readCsv, toCsv } from "../../src/index.ts";

// ─── readCsv ──────────────────────────────────────────────────────────────────

describe("readCsv", () => {
  describe("basic parsing", () => {
    it("parses a simple CSV with header", () => {
      const df = readCsv("name,age\nAlice,30\nBob,25");
      expect(df.shape).toEqual([2, 2]);
      expect(df.columns.toArray()).toEqual(["name", "age"]);
      expect(df.col("name").toArray()).toEqual(["Alice", "Bob"]);
      expect(df.col("age").toArray()).toEqual([30, 25]);
    });

    it("infers integers from numeric strings", () => {
      const df = readCsv("x\n1\n2\n3");
      expect(df.col("x").toArray()).toEqual([1, 2, 3]);
    });

    it("infers floats", () => {
      const df = readCsv("x\n1.5\n2.5");
      expect(df.col("x").toArray()).toEqual([1.5, 2.5]);
    });

    it("infers booleans", () => {
      const df = readCsv("flag\ntrue\nfalse\nTrue\nFalse");
      expect(df.col("flag").toArray()).toEqual([true, false, true, false]);
    });

    it("empty input returns empty DataFrame", () => {
      const df = readCsv("");
      expect(df.shape[0]).toBe(0);
    });

    it("header-only returns 0 rows", () => {
      const df = readCsv("a,b,c");
      expect(df.shape).toEqual([0, 3]);
    });
  });

  describe("delimiter", () => {
    it("parses TSV with sep=\\t", () => {
      const df = readCsv("a\tb\n1\t2", { sep: "\t" });
      expect(df.col("a").iat(0)).toBe(1);
      expect(df.col("b").iat(0)).toBe(2);
    });

    it("parses pipe-delimited with sep=|", () => {
      const df = readCsv("a|b\n3|4", { sep: "|" });
      expect(df.col("a").iat(0)).toBe(3);
    });
  });

  describe("quoted fields", () => {
    it("handles commas inside quoted fields", () => {
      const df = readCsv(`name,city\n"Smith, Jr.","New York"`);
      expect(df.col("name").iat(0)).toBe("Smith, Jr.");
      expect(df.col("city").iat(0)).toBe("New York");
    });

    it("handles escaped double-quotes inside quoted fields", () => {
      const df = readCsv(`q\n"say ""hi"""`);
      expect(df.col("q").iat(0)).toBe('say "hi"');
    });
  });

  describe("NA values", () => {
    it("treats empty cell as null", () => {
      const df = readCsv("a\n1\n\n3");
      expect(df.col("a").iat(1)).toBeNull();
    });

    it("treats NA as null", () => {
      const df = readCsv("a\n1\nNA\n3");
      expect(df.col("a").iat(1)).toBeNull();
    });

    it("treats custom naValue as null", () => {
      const df = readCsv("a\n1\nmissing\n3", { naValues: ["missing"] });
      expect(df.col("a").iat(1)).toBeNull();
    });
  });

  describe("header=false", () => {
    it("generates numeric column names when header=false", () => {
      const df = readCsv("1,2,3", { header: false });
      expect(df.columns.toArray()).toEqual(["0", "1", "2"]);
    });
  });

  describe("explicit names", () => {
    it("uses provided column names and treats all rows as data", () => {
      const df = readCsv("1,2\n3,4", { names: ["x", "y"] });
      expect(df.columns.toArray()).toEqual(["x", "y"]);
      expect(df.shape[0]).toBe(2);
    });
  });

  describe("comments", () => {
    it("skips comment lines", () => {
      const csv = "a,b\n# this is a comment\n1,2\n3,4";
      const df = readCsv(csv, { comment: "#" });
      expect(df.shape[0]).toBe(2);
    });
  });

  describe("CRLF line endings", () => {
    it("handles \\r\\n", () => {
      const df = readCsv("a,b\r\n1,2\r\n3,4");
      expect(df.shape[0]).toBe(2);
    });
  });
});

// ─── toCsv ────────────────────────────────────────────────────────────────────

describe("toCsv", () => {
  it("writes header and data rows", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const csv = toCsv(df, { index: false });
    expect(csv).toBe("a,b\n1,3\n2,4\n");
  });

  it("includes index by default", () => {
    const df = DataFrame.fromColumns({ x: [10, 20] });
    const csv = toCsv(df);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(",x"); // empty index column name
    expect(lines[1]).toBe("0,10");
    expect(lines[2]).toBe("1,20");
  });

  it("custom index column name", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const csv = toCsv(df, { index: "row" });
    expect(csv.split("\n")[0]).toBe("row,x");
  });

  it("header=false omits header", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const csv = toCsv(df, { index: false, header: false });
    expect(csv).toBe("1\n2\n");
  });

  it("writes null as empty by default", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] });
    const csv = toCsv(df, { index: false });
    expect(csv.split("\n")[2]).toBe("");
  });

  it("naRep option", () => {
    const df = DataFrame.fromColumns({ a: [1, null] });
    const csv = toCsv(df, { index: false, naRep: "NA" });
    expect(csv.split("\n")[2]).toBe("NA");
  });

  it("quotes fields containing the delimiter", () => {
    const df = DataFrame.fromColumns({ a: ["hello,world"] });
    const csv = toCsv(df, { index: false });
    expect(csv.trim()).toBe('a\n"hello,world"');
  });

  it("custom sep", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const csv = toCsv(df, { sep: "\t", index: false });
    expect(csv).toBe("a\tb\n1\t3\n2\t4\n");
  });

  describe("round-trip", () => {
    it("readCsv(toCsv(df)) recovers original data", () => {
      const df = DataFrame.fromColumns({ name: ["Alice", "Bob"], score: [95, 87] });
      const csv = toCsv(df, { index: false });
      const df2 = readCsv(csv);
      expect(df2.col("name").toArray()).toEqual(["Alice", "Bob"]);
      expect(df2.col("score").toArray()).toEqual([95, 87]);
    });

    it("property: round-trip numeric data", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({ a: fc.integer(), b: fc.float({ noNaN: true, noDefaultInfinity: true }) }),
            { minLength: 1, maxLength: 20 },
          ),
          (rows) => {
            const df = DataFrame.fromRecords(rows.map((r) => ({ a: r.a, b: r.b })));
            const csv = toCsv(df, { index: false });
            const df2 = readCsv(csv);
            const a2 = df2.col("a").toArray();
            const b2 = df2.col("b").toArray();
            return (
              a2.every((v, i) => v === df.col("a").iat(i)) &&
              b2.every((v, i) => {
                const orig = df.col("b").iat(i);
                return v === orig;
              })
            );
          },
        ),
      );
    });
  });
});
