/**
 * Tests for src/io/read_avro.ts
 *
 * Covers readAvro and toAvro (round-trip), schema types, usecols, empty files,
 * error handling, and fast-check property tests.
 */
import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/frame.ts";
import { readAvro, toAvro } from "../../src/io/read_avro.ts";

// ─── Helpers: build minimal Avro OCF by hand ─────────────────────────────────

function writeLongTo(arr: number[], v: number): void {
  let n = (v << 1) ^ (v >> 31);
  while (n & ~0x7f) {
    arr.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  arr.push(n);
}

function writeStringTo(arr: number[], s: string): void {
  const b = new TextEncoder().encode(s);
  writeLongTo(arr, b.length);
  for (const byte of b) {
    arr.push(byte);
  }
}

function writeBytesTo(arr: number[], b: Uint8Array): void {
  writeLongTo(arr, b.length);
  for (const byte of b) {
    arr.push(byte);
  }
}

function buildAvroOCF(schema: object, rows: Record<string, unknown>[]): Uint8Array {
  const schemaBytes = new TextEncoder().encode(JSON.stringify(schema));
  const sync = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const buf: number[] = [];

  // Magic
  buf.push(79, 98, 106, 1); // "Obj\x01"

  // Metadata: avro.schema + avro.codec
  writeLongTo(buf, 2);
  writeStringTo(buf, "avro.schema");
  writeBytesTo(buf, schemaBytes);
  writeStringTo(buf, "avro.codec");
  writeBytesTo(buf, new TextEncoder().encode("null"));
  writeLongTo(buf, 0);

  // Sync marker
  for (const b of sync) {
    buf.push(b);
  }

  // Encode rows
  const rowBuf: number[] = [];
  for (const row of rows) {
    for (const field of (schema as { fields: { name: string; type: unknown }[] }).fields) {
      const v = row[field.name];
      const t = field.type;
      if (t === "null") {
        // nothing
      } else if (t === "boolean") {
        rowBuf.push(v ? 1 : 0);
      } else if (t === "int" || t === "long") {
        writeLongTo(rowBuf, typeof v === "number" ? v : 0);
      } else if (t === "double") {
        const arr = new Float64Array(1);
        arr[0] = typeof v === "number" ? v : 0;
        for (const b of new Uint8Array(arr.buffer)) {
          rowBuf.push(b);
        }
      } else if (t === "string") {
        writeStringTo(rowBuf, String(v ?? ""));
      } else if (Array.isArray(t)) {
        // union ["null", X]
        if (v === null || v === undefined) {
          writeLongTo(rowBuf, 0);
        } else {
          writeLongTo(rowBuf, 1);
          const inner = t[1] as string;
          if (inner === "string") {
            writeStringTo(rowBuf, String(v));
          } else if (inner === "long" || inner === "int") {
            writeLongTo(rowBuf, Number(v));
          } else if (inner === "double") {
            const a2 = new Float64Array(1);
            a2[0] = Number(v);
            for (const b of new Uint8Array(a2.buffer)) {
              rowBuf.push(b);
            }
          }
        }
      }
    }
  }

  // Data block: count, byteCount, data, sync
  if (rowBuf.length > 0) {
    writeLongTo(buf, rows.length);
    writeLongTo(buf, rowBuf.length);
    for (const b of rowBuf) {
      buf.push(b);
    }
    for (const b of sync) {
      buf.push(b);
    }
  }

  return new Uint8Array(buf);
}

// ─── readAvro – basic parsing ──────────────────────────────────────────────────

describe("readAvro – basic types", () => {
  it("reads an int column", () => {
    const schema = { type: "record", name: "R", fields: [{ name: "n", type: "int" }] };
    const buf = buildAvroOCF(schema, [{ n: 1 }, { n: -2 }, { n: 42 }]);
    const df = readAvro(buf);
    expect(df.shape[0]).toBe(3);
    expect(df.col("n").at(0)).toBe(1);
    expect(df.col("n").at(1)).toBe(-2);
    expect(df.col("n").at(2)).toBe(42);
  });

  it("reads a double column", () => {
    const schema = { type: "record", name: "R", fields: [{ name: "v", type: "double" }] };
    const buf = buildAvroOCF(schema, [{ v: 3.14 }, { v: -1.5 }]);
    const df = readAvro(buf);
    expect(df.col("v").at(0) as number).toBeCloseTo(3.14, 5);
    expect(df.col("v").at(1) as number).toBeCloseTo(-1.5, 5);
  });

  it("reads a string column", () => {
    const schema = { type: "record", name: "R", fields: [{ name: "s", type: "string" }] };
    const buf = buildAvroOCF(schema, [{ s: "hello" }, { s: "world" }]);
    const df = readAvro(buf);
    expect(df.col("s").at(0)).toBe("hello");
    expect(df.col("s").at(1)).toBe("world");
  });

  it("reads a boolean column", () => {
    const schema = { type: "record", name: "R", fields: [{ name: "b", type: "boolean" }] };
    const buf = buildAvroOCF(schema, [{ b: true }, { b: false }]);
    const df = readAvro(buf);
    expect(df.col("b").at(0)).toBe(true);
    expect(df.col("b").at(1)).toBe(false);
  });

  it("reads nullable (union) columns with null values", () => {
    const schema = {
      type: "record",
      name: "R",
      fields: [{ name: "x", type: ["null", "string"] }],
    };
    const buf = buildAvroOCF(schema, [{ x: "foo" }, { x: null }, { x: "bar" }]);
    const df = readAvro(buf);
    expect(df.col("x").at(0)).toBe("foo");
    expect(df.col("x").at(1)).toBeNull();
    expect(df.col("x").at(2)).toBe("bar");
  });

  it("reads multiple columns of mixed types", () => {
    const schema = {
      type: "record",
      name: "R",
      fields: [
        { name: "id", type: "int" },
        { name: "name", type: "string" },
        { name: "val", type: "double" },
      ],
    };
    const rows = [
      { id: 1, name: "alice", val: 1.1 },
      { id: 2, name: "bob", val: 2.2 },
    ];
    const df = readAvro(buildAvroOCF(schema, rows));
    expect(df.shape).toEqual([2, 3]);
    expect(df.col("id").at(0)).toBe(1);
    expect(df.col("name").at(1)).toBe("bob");
    expect(df.col("val").at(1) as number).toBeCloseTo(2.2, 5);
  });
});

describe("readAvro – usecols", () => {
  it("returns only requested columns", () => {
    const schema = {
      type: "record",
      name: "R",
      fields: [
        { name: "a", type: "int" },
        { name: "b", type: "string" },
        { name: "c", type: "double" },
      ],
    };
    const rows = [
      { a: 1, b: "x", c: 0.5 },
      { a: 2, b: "y", c: 1.5 },
    ];
    const df = readAvro(buildAvroOCF(schema, rows), { usecols: ["a", "c"] });
    expect([...df.columns.values]).toEqual(["a", "c"]);
    expect(df.shape[1]).toBe(2);
  });
});

describe("readAvro – error handling", () => {
  it("throws on bad magic bytes", () => {
    const bad = new Uint8Array(20);
    bad.fill(0);
    expect(() => readAvro(bad)).toThrow();
  });

  it("accepts ArrayBuffer input", () => {
    const schema = { type: "record", name: "R", fields: [{ name: "n", type: "int" }] };
    const buf = buildAvroOCF(schema, [{ n: 7 }]);
    const df = readAvro(buf.buffer as ArrayBuffer);
    expect(df.col("n").at(0)).toBe(7);
  });

  it("throws for unsupported codec", () => {
    // Build a fake header with codec=deflate
    const schema = { type: "record", name: "R", fields: [{ name: "n", type: "int" }] };
    const schemaBytes = new TextEncoder().encode(JSON.stringify(schema));
    const buf: number[] = [79, 98, 106, 1]; // magic
    writeLongTo(buf, 2);
    writeStringTo(buf, "avro.schema");
    writeBytesTo(buf, schemaBytes);
    writeStringTo(buf, "avro.codec");
    writeBytesTo(buf, new TextEncoder().encode("deflate"));
    writeLongTo(buf, 0);
    for (let i = 0; i < 16; i++) {
      buf.push(i); // sync
    }
    // No data blocks
    expect(() => readAvro(new Uint8Array(buf))).toThrow(/deflate/);
  });
});

describe("readAvro – empty file", () => {
  it("returns empty DataFrame for file with no rows", () => {
    const schema = { type: "record", name: "R", fields: [{ name: "n", type: "int" }] };
    const df = readAvro(buildAvroOCF(schema, []));
    expect(df.shape[0]).toBe(0);
  });
});

// ─── toAvro / round-trip ──────────────────────────────────────────────────────

describe("toAvro – file structure", () => {
  it("starts with Avro magic bytes", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const buf = toAvro(df);
    expect(buf[0]).toBe(79); // 'O'
    expect(buf[1]).toBe(98); // 'b'
    expect(buf[2]).toBe(106); // 'j'
    expect(buf[3]).toBe(1); // version
  });

  it("produces a Uint8Array", () => {
    const df = DataFrame.fromColumns({ x: [1.1, 2.2] });
    expect(toAvro(df)).toBeInstanceOf(Uint8Array);
  });
});

describe("toAvro + readAvro – round-trip", () => {
  it("integer column round-trips", () => {
    const df = DataFrame.fromColumns({ id: [1, 2, 3, 4, 5] });
    const buf = toAvro(df);
    const df2 = readAvro(buf);
    expect(df2.shape[0]).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(df2.col("id").at(i)).toBe(i + 1);
    }
  });

  it("double column round-trips", () => {
    const df = DataFrame.fromColumns({ v: [1.5, 2.5, 3.5] });
    const buf = toAvro(df);
    const df2 = readAvro(buf);
    expect(df2.col("v").at(0) as number).toBeCloseTo(1.5, 5);
    expect(df2.col("v").at(2) as number).toBeCloseTo(3.5, 5);
  });

  it("string column round-trips", () => {
    const df = DataFrame.fromColumns({ name: ["alice", "bob", "carol"] });
    const buf = toAvro(df);
    const df2 = readAvro(buf);
    expect(df2.col("name").at(1)).toBe("bob");
  });

  it("boolean column round-trips", () => {
    const df = DataFrame.fromColumns({ flag: [true, false, true] });
    const buf = toAvro(df);
    const df2 = readAvro(buf);
    expect(df2.col("flag").at(0)).toBe(true);
    expect(df2.col("flag").at(1)).toBe(false);
  });

  it("null values round-trip in nullable columns", () => {
    const df = DataFrame.fromColumns({ x: [1, null, 3] });
    const buf = toAvro(df);
    const df2 = readAvro(buf);
    expect(df2.col("x").at(0)).toBe(1);
    expect(df2.col("x").at(1)).toBeNull();
    expect(df2.col("x").at(2)).toBe(3);
  });

  it("multi-column mixed-type round-trip", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2, 3],
      name: ["a", "b", "c"],
      score: [0.1, 0.2, 0.3],
      active: [true, false, true],
    });
    const buf = toAvro(df);
    const df2 = readAvro(buf);
    expect(df2.shape).toEqual([3, 4]);
    expect(df2.col("name").at(1)).toBe("b");
    expect(df2.col("score").at(2) as number).toBeCloseTo(0.3, 5);
  });

  it("empty DataFrame round-trips", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    const buf = toAvro(df);
    const df2 = readAvro(buf);
    expect(df2.shape[0]).toBe(0);
  });
});

// ─── Property-based tests ──────────────────────────────────────────────────────

describe("property tests", () => {
  it("integer round-trip: toAvro → readAvro preserves integer values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (vals) => {
          const df = DataFrame.fromColumns({ n: vals });
          const df2 = readAvro(toAvro(df));
          for (let i = 0; i < vals.length; i++) {
            if (df2.col("n").at(i) !== vals[i]) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("string round-trip preserves values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 20 }), { minLength: 1, maxLength: 15 }),
        (vals) => {
          const df = DataFrame.fromColumns({ s: vals });
          const df2 = readAvro(toAvro(df));
          for (let i = 0; i < vals.length; i++) {
            if (df2.col("s").at(i) !== vals[i]) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("row count is preserved in round-trip", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 30 }),
        (vals) => {
          const df = DataFrame.fromColumns({ n: vals });
          const df2 = readAvro(toAvro(df));
          return df2.shape[0] === vals.length;
        },
      ),
    );
  });
});
