/**
 * Tests for src/io/to_excel.ts — toExcel().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import { readExcel } from "../../src/io/read_excel.ts";
import { toExcel } from "../../src/io/to_excel.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Write then read back, returning the round-trip DataFrame. */
function roundTrip(df: DataFrame, opts?: Parameters<typeof toExcel>[1]): DataFrame {
  const buf = toExcel(df, opts);
  // readExcel skips the index column by default (indexCol: null)
  return readExcel(buf);
}

// ─── Output Format ────────────────────────────────────────────────────────────

describe("toExcel — output format", () => {
  it("returns a non-empty Uint8Array", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] });
    const buf = toExcel(df);
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("starts with ZIP local-file-header signature PK\\x03\\x04", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toExcel(df);
    // ZIP magic bytes at offset 0
    expect(buf[0]).toBe(0x50); // 'P'
    expect(buf[1]).toBe(0x4b); // 'K'
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
  });

  it("contains EOCD signature PK\\x05\\x06 near the end", () => {
    const df = DataFrame.fromColumns({ x: [1, 2] });
    const buf = toExcel(df);
    // Scan backwards for EOCD
    let found = false;
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("is parseable by readExcel", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const buf = toExcel(df, { index: false });
    const result = readExcel(buf);
    expect(result).toBeInstanceOf(DataFrame);
    expect(result.shape).toEqual([3, 1]);
  });
});

// ─── Round-trip: numbers ──────────────────────────────────────────────────────

describe("toExcel round-trip — numbers", () => {
  it("round-trips integer values", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
    const rt = roundTrip(df, { index: false });
    expect(rt.shape).toEqual([3, 2]);
    expect([...rt.col("a").values]).toEqual([1, 2, 3]);
    expect([...rt.col("b").values]).toEqual([10, 20, 30]);
  });

  it("round-trips floating-point values", () => {
    const df = DataFrame.fromColumns({ x: [1.5, 2.75, -0.125] });
    const rt = roundTrip(df, { index: false });
    const vals = [...rt.col("x").values] as number[];
    expect(vals[0]).toBeCloseTo(1.5);
    expect(vals[1]).toBeCloseTo(2.75);
    expect(vals[2]).toBeCloseTo(-0.125);
  });

  it("round-trips negative and zero values", () => {
    const df = DataFrame.fromColumns({ v: [-100, 0, 100] });
    const rt = roundTrip(df, { index: false });
    expect([...rt.col("v").values]).toEqual([-100, 0, 100]);
  });

  it("handles Infinity and -Infinity as strings", () => {
    const df = DataFrame.fromColumns({
      x: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1],
    });
    const rt = roundTrip(df, { index: false });
    // Non-finite numbers are written as SST strings
    const vals = [...rt.col("x").values];
    expect(vals[0]).toBe("Infinity");
    expect(vals[1]).toBe("-Infinity");
    expect(vals[2]).toBe(1);
  });
});

// ─── Round-trip: strings ──────────────────────────────────────────────────────

describe("toExcel round-trip — strings", () => {
  it("round-trips string columns", () => {
    const df = DataFrame.fromColumns({ name: ["Alice", "Bob", "Charlie"] });
    const rt = roundTrip(df, { index: false });
    expect([...rt.col("name").values]).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("round-trips strings with XML special characters", () => {
    const df = DataFrame.fromColumns({ s: ["<tag>", "&amp;", '"quote"'] });
    const rt = roundTrip(df, { index: false });
    expect([...rt.col("s").values]).toEqual(["<tag>", "&amp;", '"quote"']);
  });

  it("round-trips empty string", () => {
    // Empty strings become null on readExcel (pandas-compatible NA coercion).
    const df = DataFrame.fromColumns({ s: ["a", "", "b"] });
    const rt = roundTrip(df, { index: false });
    expect([...rt.col("s").values]).toEqual(["a", null, "b"]);
  });

  it("round-trips strings with spaces", () => {
    const df = DataFrame.fromColumns({ s: ["  hello  ", "world"] });
    const rt = roundTrip(df, { index: false });
    expect([...rt.col("s").values]).toEqual(["  hello  ", "world"]);
  });
});

// ─── Round-trip: booleans ────────────────────────────────────────────────────

describe("toExcel round-trip — booleans", () => {
  it("round-trips boolean columns", () => {
    const df = DataFrame.fromColumns({ b: [true, false, true] });
    const rt = roundTrip(df, { index: false });
    expect([...rt.col("b").values]).toEqual([true, false, true]);
  });
});

// ─── Round-trip: null values ──────────────────────────────────────────────────

describe("toExcel round-trip — null values", () => {
  it("writes null as empty cell by default (readExcel returns null)", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] });
    const rt = roundTrip(df, { index: false });
    const vals = [...rt.col("a").values];
    expect(vals[0]).toBe(1);
    expect(vals[1]).toBeNull();
    expect(vals[2]).toBe(3);
  });

  it("writes null as naRep string when naRep is set", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] });
    const rt = roundTrip(df, { index: false, naRep: "N/A" });
    const vals = [...rt.col("a").values];
    expect(vals[0]).toBe(1);
    // "N/A" is in BUILTIN_NA so readExcel converts it back to null.
    expect(vals[1]).toBeNull();
    expect(vals[2]).toBe(3);
  });

  it("handles all-null column", () => {
    const df = DataFrame.fromColumns({ a: [null, null, null] });
    const buf = toExcel(df, { index: false });
    expect(buf.length).toBeGreaterThan(0);
    const rt = readExcel(buf);
    const vals = [...rt.col("a").values];
    for (const v of vals) {
      expect(v).toBeNull();
    }
  });
});

// ─── Mixed types ──────────────────────────────────────────────────────────────

describe("toExcel — mixed column types", () => {
  it("round-trips a DataFrame with numeric, string, and boolean columns", () => {
    const df = DataFrame.fromColumns({
      name: ["Alice", "Bob", "Charlie"],
      score: [95.5, 87, 100],
      passed: [true, true, false],
    });
    const rt = roundTrip(df, { index: false });
    expect(rt.shape).toEqual([3, 3]);
    expect([...rt.col("name").values]).toEqual(["Alice", "Bob", "Charlie"]);
    const scores = [...rt.col("score").values] as number[];
    expect(scores[0]).toBeCloseTo(95.5);
    expect(scores[1]).toBe(87);
    expect(scores[2]).toBe(100);
    expect([...rt.col("passed").values]).toEqual([true, true, false]);
  });
});

// ─── Options: header ─────────────────────────────────────────────────────────

describe("toExcel — header option", () => {
  it("header: true writes column names in row 1 (default)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const rt = roundTrip(df, { index: false });
    expect([...rt.columns.values]).toEqual(["a", "b"]);
    expect(rt.shape[0]).toBe(2);
  });

  it("header: false omits header row, columns become 0-indexed strings", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const buf = toExcel(df, { index: false, header: false });
    const rt = readExcel(buf, { header: null });
    // no header → 2 data rows, column names are "0", "1"
    expect(rt.shape[0]).toBe(2);
  });
});

// ─── Options: index ───────────────────────────────────────────────────────────

describe("toExcel — index option", () => {
  it("index: false omits the row index column", () => {
    const df = DataFrame.fromColumns({ a: [10, 20] });
    const rt = roundTrip(df, { index: false });
    expect([...rt.columns.values]).toEqual(["a"]);
    expect(rt.shape).toEqual([2, 1]);
  });

  it("index: true adds an extra column for the row index (default)", () => {
    const df = DataFrame.fromColumns({ a: [10, 20] });
    const buf = toExcel(df, { index: true });
    const rt = readExcel(buf);
    // First column is the (empty-header) index, second is "a"
    expect(rt.shape[1]).toBe(2);
  });

  it("index: true with string index round-trips index values", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] }, { index: ["x", "y", "z"] });
    const buf = toExcel(df, { index: true });
    const rt = readExcel(buf);
    // First column contains the string index values
    const idxCol = [...rt.col(rt.columns.values[0] ?? "").values];
    expect(idxCol).toEqual(["x", "y", "z"]);
  });
});

// ─── Options: columns ────────────────────────────────────────────────────────

describe("toExcel — columns option", () => {
  it("writes only the specified columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const rt = roundTrip(df, { index: false, columns: ["a", "c"] });
    expect([...rt.columns.values]).toEqual(["a", "c"]);
    expect(rt.shape).toEqual([2, 2]);
    expect([...rt.col("a").values]).toEqual([1, 2]);
    expect([...rt.col("c").values]).toEqual([5, 6]);
  });

  it("throws on unknown column name", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    expect(() => toExcel(df, { columns: ["z"] })).toThrow(/column.*z.*not found/i);
  });
});

// ─── Options: sheetName ───────────────────────────────────────────────────────

describe("toExcel — sheetName option", () => {
  it("uses 'Sheet1' as the default sheet name", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toExcel(df, { index: false });
    // Verify workbook XML contains name="Sheet1"
    const text = new TextDecoder().decode(buf);
    expect(text).toContain('name="Sheet1"');
  });

  it("uses a custom sheet name", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toExcel(df, { index: false, sheetName: "MyData" });
    const text = new TextDecoder().decode(buf);
    expect(text).toContain('name="MyData"');
  });
});

// ─── Options: naRep ───────────────────────────────────────────────────────────

describe("toExcel — naRep option", () => {
  it("represents NaN as naRep string", () => {
    const df = DataFrame.fromColumns({ x: [1, Number.NaN, 3] });
    const rt = roundTrip(df, { index: false, naRep: "missing" });
    const vals = [...rt.col("x").values];
    expect(vals[0]).toBe(1);
    expect(vals[1]).toBe("missing");
    expect(vals[2]).toBe(3);
  });
});

// ─── Options: startRow / startCol ────────────────────────────────────────────

describe("toExcel — startRow/startCol options", () => {
  it("shifts data by startRow/startCol without breaking readExcel", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const buf = toExcel(df, { index: false, startRow: 2, startCol: 2 });
    // readExcel with header=2 reads from row 3 (0-indexed → header at startRow)
    const rt = readExcel(buf, { header: 2 });
    expect([...rt.col("a").values]).toEqual([1, 2]);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("toExcel — edge cases", () => {
  it("handles an empty DataFrame (0 rows)", () => {
    const df = DataFrame.fromColumns({ a: [], b: [] });
    const buf = toExcel(df, { index: false });
    expect(buf.length).toBeGreaterThan(0);
    const rt = readExcel(buf);
    expect(rt.shape[0]).toBe(0);
    expect([...rt.columns.values]).toEqual(["a", "b"]);
  });

  it("handles a single-cell DataFrame", () => {
    const df = DataFrame.fromColumns({ x: [42] });
    const rt = roundTrip(df, { index: false });
    expect(rt.shape).toEqual([1, 1]);
    expect(rt.col("x").values[0]).toBe(42);
  });

  it("handles large string values without truncation", () => {
    const longStr = "x".repeat(1000);
    const df = DataFrame.fromColumns({ s: [longStr] });
    const rt = roundTrip(df, { index: false });
    expect(rt.col("s").values[0]).toBe(longStr);
  });

  it("handles duplicate string values (SST deduplication)", () => {
    const df = DataFrame.fromColumns({ a: ["hello", "hello", "world"] });
    const rt = roundTrip(df, { index: false });
    expect([...rt.col("a").values]).toEqual(["hello", "hello", "world"]);
  });

  it("returns a valid ZIP even for a 0-column, 0-row DataFrame", () => {
    const df = DataFrame.fromColumns({});
    const buf = toExcel(df);
    // Should not throw and should return a valid ZIP
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});

// ─── Property-based tests ────────────────────────────────────────────────────

describe("toExcel — property-based round-trip", () => {
  it("round-trips arbitrary numeric DataFrames", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (colA, colB) => {
          // Use the shorter length
          const n = Math.min(colA.length, colB.length);
          const a = colA.slice(0, n);
          const b = colB.slice(0, n);
          const df = DataFrame.fromColumns({ a, b });
          const rt = roundTrip(df, { index: false });
          expect(rt.shape).toEqual([n, 2]);
          const rtA = [...rt.col("a").values] as number[];
          const rtB = [...rt.col("b").values] as number[];
          for (let i = 0; i < n; i++) {
            expect(rtA[i]).toBeCloseTo(a[i] ?? 0, 10);
            expect(rtB[i]).toBeCloseTo(b[i] ?? 0, 10);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("round-trips arbitrary string DataFrames", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 15,
        }),
        (vals) => {
          const df = DataFrame.fromColumns({ s: vals });
          const rt = roundTrip(df, { index: false });
          expect(rt.shape).toEqual([vals.length, 1]);
          const rtVals = [...rt.col("s").values];
          for (let i = 0; i < vals.length; i++) {
            expect(rtVals[i]).toBe(vals[i]);
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
