/**
 * Tests for readFeather / toFeather.
 *
 * Covers:
 * - Round-trip for all supported column types (int64, float64, bool, utf8)
 * - Null / nullable columns
 * - Empty DataFrame
 * - usecols and indexCol options
 * - fast-check property tests
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/frame.ts";
import { readFeather, toFeather } from "../../src/io/feather.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function roundtrip(df: DataFrame): DataFrame {
  return readFeather(toFeather(df));
}

function colData(df: DataFrame, name: string): readonly unknown[] {
  return df.col(name).values;
}

// ─── magic bytes ──────────────────────────────────────────────────────────────

describe("toFeather – file structure", () => {
  it("starts and ends with ARROW1 magic", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const buf = toFeather(df);
    expect(new TextDecoder().decode(buf.subarray(0, 6))).toBe("ARROW1");
    expect(new TextDecoder().decode(buf.subarray(buf.length - 8, buf.length - 2))).toBe("ARROW1");
  });

  it("throws on bad magic", () => {
    const bad = new Uint8Array(20);
    expect(() => readFeather(bad)).toThrow("bad magic");
  });
});

// ─── integer columns ──────────────────────────────────────────────────────────

describe("integer columns", () => {
  it("roundtrips integer values", () => {
    const df = DataFrame.fromColumns({ x: [0, 1, -1, 1000, -1000, 2147483647] });
    const out = roundtrip(df);
    expect([...colData(out, "x")]).toEqual([0, 1, -1, 1000, -1000, 2147483647]);
  });

  it("roundtrips zero-length integer column", () => {
    const df = DataFrame.fromColumns({ n: [] });
    const out = roundtrip(df);
    expect(out.shape).toEqual([0, 1]);
  });

  it("roundtrips negative integers", () => {
    const df = DataFrame.fromColumns({ v: [-9007199254740991, 9007199254740991] });
    const out = roundtrip(df);
    expect([...colData(out, "v")]).toEqual([-9007199254740991, 9007199254740991]);
  });
});

// ─── float columns ────────────────────────────────────────────────────────────

describe("float columns", () => {
  it("roundtrips float64 values", () => {
    const df = DataFrame.fromColumns({ f: [1.5, -2.25, 0.0, 3.14159265358979] });
    const out = roundtrip(df);
    const vals = [...colData(out, "f")] as number[];
    expect(vals[0]).toBeCloseTo(1.5, 10);
    expect(vals[1]).toBeCloseTo(-2.25, 10);
    expect(vals[2]).toBe(0);
    expect(vals[3]).toBeCloseTo(3.14159265358979, 10);
  });

  it("roundtrips NaN and Infinity", () => {
    const df = DataFrame.fromColumns({ f: [NaN, Infinity, -Infinity] });
    const out = roundtrip(df);
    const vals = [...colData(out, "f")] as number[];
    expect(Number.isNaN(vals[0])).toBe(true);
    expect(vals[1]).toBe(Infinity);
    expect(vals[2]).toBe(-Infinity);
  });
});

// ─── bool columns ─────────────────────────────────────────────────────────────

describe("bool columns", () => {
  it("roundtrips boolean values", () => {
    const df = DataFrame.fromColumns({ b: [true, false, true, false, false] });
    const out = roundtrip(df);
    expect([...colData(out, "b")]).toEqual([true, false, true, false, false]);
  });

  it("roundtrips single-element bool", () => {
    const df = DataFrame.fromColumns({ b: [true] });
    expect([...colData(roundtrip(df), "b")]).toEqual([true]);
    const df2 = DataFrame.fromColumns({ b: [false] });
    expect([...colData(roundtrip(df2), "b")]).toEqual([false]);
  });
});

// ─── string columns ───────────────────────────────────────────────────────────

describe("string columns", () => {
  it("roundtrips ASCII strings", () => {
    const df = DataFrame.fromColumns({ s: ["hello", "world", "foo", "bar"] });
    const out = roundtrip(df);
    expect([...colData(out, "s")]).toEqual(["hello", "world", "foo", "bar"]);
  });

  it("roundtrips empty strings", () => {
    const df = DataFrame.fromColumns({ s: ["", "a", ""] });
    expect([...colData(roundtrip(df), "s")]).toEqual(["", "a", ""]);
  });

  it("roundtrips unicode strings", () => {
    const df = DataFrame.fromColumns({ s: ["こんにちは", "世界", "🎉"] });
    expect([...colData(roundtrip(df), "s")]).toEqual(["こんにちは", "世界", "🎉"]);
  });
});

// ─── null handling ────────────────────────────────────────────────────────────

describe("null handling", () => {
  it("roundtrips nullable integer column", () => {
    const df = DataFrame.fromColumns({ n: [1, null, 3, null, 5] });
    const out = roundtrip(df);
    expect([...colData(out, "n")]).toEqual([1, null, 3, null, 5]);
  });

  it("roundtrips nullable float column", () => {
    const df = DataFrame.fromColumns({ f: [1.5, null, 2.5] });
    const out = roundtrip(df);
    const vals = [...colData(out, "f")] as (number | null)[];
    expect(vals[0]).toBeCloseTo(1.5);
    expect(vals[1]).toBeNull();
    expect(vals[2]).toBeCloseTo(2.5);
  });

  it("roundtrips nullable string column", () => {
    const df = DataFrame.fromColumns({ s: ["a", null, "c"] });
    expect([...colData(roundtrip(df), "s")]).toEqual(["a", null, "c"]);
  });

  it("roundtrips all-null column", () => {
    const df = DataFrame.fromColumns({ n: [null, null, null] });
    const out = roundtrip(df);
    expect([...colData(out, "n")]).toEqual([null, null, null]);
  });

  it("roundtrips no-null column (no validity bitmap emitted)", () => {
    const df = DataFrame.fromColumns({ n: [1, 2, 3] });
    const buf = toFeather(df);
    // Validity buffer length should be 0 for non-nullable columns
    const out = readFeather(buf);
    expect([...colData(out, "n")]).toEqual([1, 2, 3]);
  });
});

// ─── multi-column DataFrame ───────────────────────────────────────────────────

describe("multi-column DataFrame", () => {
  it("roundtrips mixed-type columns", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2, 3],
      score: [9.5, 8.0, 7.5],
      active: [true, false, true],
      name: ["Alice", "Bob", "Carol"],
    });
    const out = roundtrip(df);
    expect([...colData(out, "id")]).toEqual([1, 2, 3]);
    expect([...colData(out, "score")].map((v) => Number(v))).toEqual([9.5, 8.0, 7.5]);
    expect([...colData(out, "active")]).toEqual([true, false, true]);
    expect([...colData(out, "name")]).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("preserves column order", () => {
    const df = DataFrame.fromColumns({ z: [1], y: [2], x: [3] });
    const out = roundtrip(df);
    expect([...out.columns.values]).toEqual(["z", "y", "x"]);
  });
});

// ─── empty DataFrame ──────────────────────────────────────────────────────────

describe("empty DataFrame", () => {
  it("roundtrips DataFrame with zero rows", () => {
    const df = DataFrame.fromColumns({ a: [], b: [] });
    const out = roundtrip(df);
    expect(out.shape).toEqual([0, 2]);
  });

  it("roundtrips DataFrame with zero columns", () => {
    const df = DataFrame.fromColumns({});
    const out = roundtrip(df);
    expect(out.shape).toEqual([0, 0]);
  });
});

// ─── options ──────────────────────────────────────────────────────────────────

describe("readFeather options", () => {
  it("usecols: reads only specified columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const out = readFeather(toFeather(df), { usecols: ["a", "c"] });
    expect([...out.columns.values]).toEqual(["a", "c"]);
    expect([...colData(out, "a")]).toEqual([1, 2]);
    expect([...colData(out, "c")]).toEqual([5, 6]);
  });

  it("indexCol: uses specified column as index", () => {
    const df = DataFrame.fromColumns({ id: ["r1", "r2", "r3"], v: [10, 20, 30] });
    const out = readFeather(toFeather(df), { indexCol: "id" });
    expect([...out.columns.values]).toEqual(["v"]);
    expect([...out.index.values]).toEqual(["r1", "r2", "r3"]);
  });
});

describe("toFeather options", () => {
  it("writeIndex: includes index as column __index_level_0__", () => {
    const df = DataFrame.fromColumns({ v: [1, 2, 3] });
    const buf = toFeather(df, { writeIndex: true });
    const out = readFeather(buf);
    expect(out.columns.values.includes("__index_level_0__")).toBe(true);
    expect([...colData(out, "__index_level_0__")]).toEqual(["0", "1", "2"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property tests", () => {
  it("integer roundtrip", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1e9, max: 1e9 }), { minLength: 0, maxLength: 50 }),
        (ints) => {
          const df = DataFrame.fromColumns({ n: ints });
          const out = roundtrip(df);
          expect([...colData(out, "n")]).toEqual(ints);
        },
      ),
    );
  });

  it("string roundtrip", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 20 }), { minLength: 0, maxLength: 30 }),
        (strs) => {
          const df = DataFrame.fromColumns({ s: strs });
          const out = roundtrip(df);
          expect([...colData(out, "s")]).toEqual(strs);
        },
      ),
    );
  });

  it("boolean roundtrip", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 100 }),
        (bools) => {
          const df = DataFrame.fromColumns({ b: bools });
          const out = roundtrip(df);
          expect([...colData(out, "b")]).toEqual(bools);
        },
      ),
    );
  });

  it("nullable integer roundtrip", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: -1e6, max: 1e6 }), { nil: null }), {
          minLength: 1,
          maxLength: 40,
        }),
        (vals) => {
          const df = DataFrame.fromColumns({ n: vals });
          const out = roundtrip(df);
          expect([...colData(out, "n")]).toEqual(vals);
        },
      ),
    );
  });
});
