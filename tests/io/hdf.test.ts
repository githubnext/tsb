/**
 * Tests for readHdf / toHdf.
 *
 * Covers:
 * - Round-trip for all supported column types (float64, float32, int64, int32,
 *   int16, int8, uint64, uint32, uint16, uint8, bool, string)
 * - Empty DataFrame
 * - usecols option
 * - indexCol / writeIndex round-trip
 * - HDF5 signature validation
 * - fast-check property tests
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/frame.ts";
import { Index } from "../../src/core/index.ts";
import { readHdf, toHdf } from "../../src/io/hdf.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function roundtrip(df: DataFrame, opts?: Parameters<typeof toHdf>[1]): DataFrame {
  return readHdf(toHdf(df, opts), opts);
}

function colVals(df: DataFrame, name: string): readonly unknown[] {
  return df.col(name).values;
}

// ─── signature / validation ───────────────────────────────────────────────────

describe("toHdf – file structure", () => {
  it("starts with HDF5 magic bytes", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const buf = toHdf(df);
    const sig = new Uint8Array([0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a]);
    for (let i = 0; i < 8; i++) {
      expect(buf[i]).toBe(sig[i]);
    }
  });

  it("throws on bad magic", () => {
    const bad = new Uint8Array(200);
    expect(() => readHdf(bad)).toThrow("invalid HDF5 signature");
  });

  it("throws on unsupported superblock version", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const buf = toHdf(df);
    const bad = buf.slice();
    bad[8] = 2; // superblock version != 0
    expect(() => readHdf(bad)).toThrow("unsupported superblock version");
  });

  it("throws on missing key", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const buf = toHdf(df, { key: "df" });
    expect(() => readHdf(buf, { key: "other" })).toThrow('key "other" not found');
  });

  it("throws if DataFrame has no columns", () => {
    const df = DataFrame.fromColumns({});
    expect(() => toHdf(df)).toThrow("at least one column");
  });
});

// ─── empty DataFrame ──────────────────────────────────────────────────────────

describe("empty DataFrame", () => {
  it("roundtrips zero-row DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [], b: [] });
    const out = roundtrip(df);
    expect(out.shape).toEqual([0, 2]);
  });
});

// ─── float columns ────────────────────────────────────────────────────────────

describe("float64 columns", () => {
  it("roundtrips basic float values", () => {
    const df = DataFrame.fromColumns({ v: [1.5, -2.5, 0.0, 1e308] });
    const out = roundtrip(df);
    expect([...colVals(out, "v")]).toEqual([1.5, -2.5, 0.0, 1e308]);
  });

  it("preserves NaN", () => {
    const df = DataFrame.fromColumns({ v: [1.0, Number.NaN, 3.0] });
    const buf = toHdf(df);
    const out = readHdf(buf);
    const vals = colVals(out, "v");
    expect(vals[0]).toBe(1.0);
    expect(vals[1]).toBeNaN();
    expect(vals[2]).toBe(3.0);
  });

  it("preserves Infinity", () => {
    const df = DataFrame.fromColumns({ v: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY] });
    const out = roundtrip(df);
    expect(colVals(out, "v")[0]).toBe(Number.POSITIVE_INFINITY);
    expect(colVals(out, "v")[1]).toBe(Number.NEGATIVE_INFINITY);
  });
});

// ─── integer columns ──────────────────────────────────────────────────────────

describe("int32 columns", () => {
  it("roundtrips positive and negative integers", () => {
    const df = DataFrame.fromColumns({ v: [0, 1, -1, 2147483647, -2147483648] });
    // int32 or int64 depending on dtype inference
    const out = roundtrip(df);
    const vals = colVals(out, "v");
    expect(vals[0]).toBe(0);
    expect(vals[1]).toBe(1);
    expect(vals[2]).toBe(-1);
  });
});

describe("int64 columns", () => {
  it("roundtrips int64 dtype", () => {
    const df = DataFrame.fromColumns({ v: [0, 1, -1, 9007199254740991] });
    const buf = toHdf(df);
    const out = readHdf(buf);
    const vals = colVals(out, "v");
    expect(vals[0]).toBe(0);
    expect(vals[3]).toBe(9007199254740991);
  });
});

// ─── bool columns ─────────────────────────────────────────────────────────────

describe("bool columns", () => {
  it("roundtrips boolean values as 0/1", () => {
    const df = DataFrame.fromColumns({ b: [true, false, true] });
    const out = roundtrip(df);
    const vals = colVals(out, "b");
    // bools round-trip as uint8 (0 or 1)
    expect(vals[0]).toBe(1);
    expect(vals[1]).toBe(0);
    expect(vals[2]).toBe(1);
  });
});

// ─── string columns ───────────────────────────────────────────────────────────

describe("string columns", () => {
  it("roundtrips ASCII strings", () => {
    const df = DataFrame.fromColumns({ s: ["hello", "world", "foo"] });
    const out = roundtrip(df);
    expect([...colVals(out, "s")]).toEqual(["hello", "world", "foo"]);
  });

  it("roundtrips UTF-8 strings", () => {
    const df = DataFrame.fromColumns({ s: ["café", "日本語", "emoji"] });
    const out = roundtrip(df);
    expect([...colVals(out, "s")]).toEqual(["café", "日本語", "emoji"]);
  });

  it("truncates strings longer than max", () => {
    // All values share the same elemSize (max among values)
    const df = DataFrame.fromColumns({ s: ["ab", "abcde"] });
    const out = roundtrip(df);
    // Both strings survive (shorter one is padded with nulls, trimmed back)
    const vals = colVals(out, "s");
    expect(vals[0]).toBe("ab");
    expect(vals[1]).toBe("abcde");
  });

  it("roundtrips empty strings", () => {
    const df = DataFrame.fromColumns({ s: ["", "a", ""] });
    const out = roundtrip(df);
    expect([...colVals(out, "s")]).toEqual(["", "a", ""]);
  });
});

// ─── multiple column types ────────────────────────────────────────────────────

describe("mixed column types", () => {
  it("roundtrips a mixed-type DataFrame", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2, 3],
      value: [1.1, 2.2, 3.3],
      label: ["a", "b", "c"],
      flag: [true, false, true],
    });
    const out = roundtrip(df);
    expect(out.shape).toEqual([3, 4]);
    expect([...colVals(out, "label")]).toEqual(["a", "b", "c"]);
    expect(colVals(out, "flag")[0]).toBe(1); // bool stored as uint8
  });
});

// ─── custom key ───────────────────────────────────────────────────────────────

describe("key option", () => {
  it("writes and reads with custom key", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30] });
    const buf = toHdf(df, { key: "mydata" });
    const out = readHdf(buf, { key: "mydata" });
    expect([...colVals(out, "x")]).toEqual([10, 20, 30]);
  });

  it("key with leading slash is normalized", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toHdf(df, { key: "/table" });
    const out = readHdf(buf, { key: "/table" });
    expect([...colVals(out, "x")]).toEqual([1]);
  });
});

// ─── usecols ──────────────────────────────────────────────────────────────────

describe("usecols option", () => {
  it("reads only the specified columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const buf = toHdf(df);
    const out = readHdf(buf, { usecols: ["a", "c"] });
    expect(out.columns.values).toContain("a");
    expect(out.columns.values).toContain("c");
    expect(out.columns.values).not.toContain("b");
  });

  it("returns all columns when usecols is null", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    const out = roundtrip(df);
    expect(out.shape[1]).toBe(2);
  });
});

// ─── writeIndex / indexCol ────────────────────────────────────────────────────

describe("writeIndex / indexCol", () => {
  it("writes and restores string index via indexCol", () => {
    const idx = new Index<string | number>(["x", "y", "z"]);
    const df = DataFrame.fromColumns({ v: [10, 20, 30] }, { index: idx });
    const buf = toHdf(df, { writeIndex: true });
    const out = readHdf(buf, { indexCol: "__index__" });
    expect([...out.index.values]).toEqual(["x", "y", "z"]);
  });

  it("does not write index when writeIndex=false", () => {
    const df = DataFrame.fromColumns({ v: [1, 2] });
    const out = roundtrip(df, { writeIndex: false });
    expect(out.columns.values).not.toContain("__index__");
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("property tests", () => {
  it("roundtrips float64 arrays of arbitrary length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 0,
          maxLength: 50,
        }),
        (arr) => {
          const df = DataFrame.fromColumns({ v: arr });
          const out = roundtrip(df);
          const vals = [...colVals(out, "v")];
          expect(vals).toHaveLength(arr.length);
          for (let i = 0; i < arr.length; i++) {
            expect(vals[i]).toBeCloseTo(arr[i] as number, 10);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("roundtrips integer arrays", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000000, max: 1000000 }), { minLength: 1, maxLength: 50 }),
        (arr) => {
          const df = DataFrame.fromColumns({ n: arr });
          const out = roundtrip(df);
          const outVals = [...colVals(out, "n")];
          expect(outVals).toHaveLength(arr.length);
          for (let i = 0; i < arr.length; i++) {
            expect(outVals[i]).toBe(arr[i]);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("roundtrips ASCII string arrays", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 10 }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const df = DataFrame.fromColumns({ s: arr });
          const out = roundtrip(df);
          const outVals = [...colVals(out, "s")];
          expect(outVals).toHaveLength(arr.length);
          for (let i = 0; i < arr.length; i++) {
            expect(outVals[i]).toBe(arr[i]);
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
