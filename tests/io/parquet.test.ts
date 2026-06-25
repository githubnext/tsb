/**
 * Tests for src/io/parquet.ts — readParquet() and toParquet().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, readParquet, toParquet } from "../../src/index.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roundTrip(df: DataFrame): DataFrame {
  const buf = toParquet(df);
  return readParquet(buf);
}

// ─── toParquet: output format ─────────────────────────────────────────────────

describe("toParquet — output format", () => {
  it("returns a non-empty Uint8Array", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] });
    const buf = toParquet(df);
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("starts with PAR1 magic bytes", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toParquet(df);
    const magic = new TextDecoder().decode(buf.subarray(0, 4));
    expect(magic).toBe("PAR1");
  });

  it("ends with PAR1 magic bytes", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toParquet(df);
    const magic = new TextDecoder().decode(buf.subarray(buf.length - 4));
    expect(magic).toBe("PAR1");
  });

  it("has at least 12 bytes (magic + footer_size + magic)", () => {
    const df = DataFrame.fromColumns({ a: [42] });
    const buf = toParquet(df);
    expect(buf.length).toBeGreaterThanOrEqual(12);
  });
});

// ─── Round-trip: numeric columns ─────────────────────────────────────────────

describe("readParquet ∘ toParquet — numeric round-trip", () => {
  it("round-trips integer columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
    const rt = roundTrip(df);
    expect(rt.shape).toEqual([3, 2]);
    expect(rt.col("a").toArray()).toEqual([1, 2, 3]);
    expect(rt.col("b").toArray()).toEqual([10, 20, 30]);
  });

  it("round-trips float columns", () => {
    const df = DataFrame.fromColumns({ x: [1.5, 2.5, 3.14] });
    const rt = roundTrip(df);
    const vals = rt.col("x").toArray();
    expect(vals.length).toBe(3);
    expect(Number(vals[0] ?? 0)).toBeCloseTo(1.5, 5);
    expect(Number(vals[1] ?? 0)).toBeCloseTo(2.5, 5);
    expect(Number(vals[2] ?? 0)).toBeCloseTo(3.14, 5);
  });

  it("round-trips zero and negative integers", () => {
    const df = DataFrame.fromColumns({ n: [0, -1, -100, 999] });
    const rt = roundTrip(df);
    expect(rt.col("n").toArray()).toEqual([0, -1, -100, 999]);
  });

  it("round-trips large integers as INT64", () => {
    const df = DataFrame.fromColumns({ n: [1e15, 2e15] });
    const rt = roundTrip(df);
    const vals = rt.col("n").toArray();
    expect(vals.length).toBe(2);
    // Large integers stored as INT64 come back as number (within safe integer range)
    expect(typeof vals[0]).toBe("number");
    expect(Math.abs(Number(vals[0] ?? 0) - 1e15)).toBeLessThan(1);
    expect(Math.abs(Number(vals[1] ?? 0) - 2e15)).toBeLessThan(1);
  });
});

// ─── Round-trip: string columns ───────────────────────────────────────────────

describe("readParquet ∘ toParquet — string round-trip", () => {
  it("round-trips string columns", () => {
    const df = DataFrame.fromColumns({ s: ["hello", "world", "foo"] });
    const rt = roundTrip(df);
    expect(rt.col("s").toArray()).toEqual(["hello", "world", "foo"]);
  });

  it("round-trips empty strings", () => {
    const df = DataFrame.fromColumns({ s: ["", "a", ""] });
    const rt = roundTrip(df);
    expect(rt.col("s").toArray()).toEqual(["", "a", ""]);
  });

  it("round-trips unicode strings", () => {
    const df = DataFrame.fromColumns({ s: ["café", "日本語", "🎉"] });
    const rt = roundTrip(df);
    expect(rt.col("s").toArray()).toEqual(["café", "日本語", "🎉"]);
  });
});

// ─── Round-trip: boolean columns ─────────────────────────────────────────────

describe("readParquet ∘ toParquet — boolean round-trip", () => {
  it("round-trips boolean columns", () => {
    const df = DataFrame.fromColumns({ b: [true, false, true, false] });
    const rt = roundTrip(df);
    expect(rt.col("b").toArray()).toEqual([true, false, true, false]);
  });

  it("round-trips all-true boolean column", () => {
    const df = DataFrame.fromColumns({ b: [true, true, true] });
    const rt = roundTrip(df);
    expect(rt.col("b").toArray()).toEqual([true, true, true]);
  });

  it("round-trips all-false boolean column", () => {
    const df = DataFrame.fromColumns({ b: [false, false] });
    const rt = roundTrip(df);
    expect(rt.col("b").toArray()).toEqual([false, false]);
  });
});

// ─── Round-trip: mixed columns ───────────────────────────────────────────────

describe("readParquet ∘ toParquet — multi-column round-trip", () => {
  it("round-trips mixed int + string columns", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2, 3],
      name: ["alice", "bob", "carol"],
    });
    const rt = roundTrip(df);
    expect(rt.col("id").toArray()).toEqual([1, 2, 3]);
    expect(rt.col("name").toArray()).toEqual(["alice", "bob", "carol"]);
  });

  it("round-trips many columns", () => {
    const data: Record<string, number[]> = {};
    for (let i = 0; i < 10; i++) {
      data[`col${i}`] = [i, i * 2, i * 3];
    }
    const df = DataFrame.fromColumns(data);
    const rt = roundTrip(df);
    expect(rt.shape).toEqual([3, 10]);
    for (let i = 0; i < 10; i++) {
      expect(rt.col(`col${i}`).toArray()).toEqual([i, i * 2, i * 3]);
    }
  });
});

// ─── Empty DataFrame ──────────────────────────────────────────────────────────

describe("readParquet ∘ toParquet — empty DataFrame", () => {
  it("round-trips an empty DataFrame", () => {
    const df = DataFrame.fromColumns({});
    const buf = toParquet(df);
    const rt = readParquet(buf);
    expect(rt.shape).toEqual([0, 0]);
  });

  it("round-trips a DataFrame with zero rows", () => {
    const df = DataFrame.fromColumns({ a: [], b: [] });
    const rt = roundTrip(df);
    expect(rt.shape[1]).toBe(2);
    expect(rt.shape[0]).toBe(0);
  });
});

// ─── Options: writeIndex ─────────────────────────────────────────────────────

describe("toParquet — writeIndex option", () => {
  it("includes index column when writeIndex: true", () => {
    const df = DataFrame.fromColumns({ v: [10, 20, 30] });
    const buf = toParquet(df, { writeIndex: true });
    const rt = readParquet(buf);
    expect(rt.columns.toArray()).toContain("__index_level_0__");
  });

  it("does not include index column by default", () => {
    const df = DataFrame.fromColumns({ v: [10, 20] });
    const rt = roundTrip(df);
    expect(rt.columns.toArray()).not.toContain("__index_level_0__");
  });
});

// ─── Options: usecols ────────────────────────────────────────────────────────

describe("readParquet — usecols option", () => {
  it("filters to selected columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const buf = toParquet(df);
    const rt = readParquet(buf, { usecols: ["a", "c"] });
    expect(rt.columns.toArray()).toEqual(["a", "c"]);
    expect(rt.col("a").toArray()).toEqual([1, 2]);
  });
});

// ─── Options: nRows ──────────────────────────────────────────────────────────

describe("readParquet — nRows option", () => {
  it("limits rows read", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3, 4, 5] });
    const buf = toParquet(df);
    const rt = readParquet(buf, { nRows: 3 });
    expect(rt.shape[0]).toBe(3);
    expect(rt.col("x").toArray()).toEqual([1, 2, 3]);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("readParquet — error handling", () => {
  it("throws on non-Parquet data", () => {
    const bad = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(() => readParquet(bad)).toThrow();
  });

  it("throws on truncated data (no end magic)", () => {
    const bad = new Uint8Array([0x50, 0x41, 0x52, 0x31, 0, 1, 2, 3]);
    expect(() => readParquet(bad)).toThrow();
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("readParquet ∘ toParquet — property tests", () => {
  it("round-trips arbitrary integer arrays", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 0, maxLength: 20 }),
        (nums) => {
          const df = DataFrame.fromColumns({ v: nums });
          const rt = roundTrip(df);
          expect(rt.col("v").toArray()).toEqual(nums);
        },
      ),
      { numRuns: 30 },
    );
  });

  it("round-trips arbitrary string arrays", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        (strs) => {
          const df = DataFrame.fromColumns({ s: strs });
          const rt = roundTrip(df);
          expect(rt.col("s").toArray()).toEqual(strs);
        },
      ),
      { numRuns: 30 },
    );
  });

  it("round-trips arbitrary boolean arrays", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }), (bools) => {
        const df = DataFrame.fromColumns({ b: bools });
        const rt = roundTrip(df);
        expect(rt.col("b").toArray()).toEqual(bools);
      }),
      { numRuns: 20 },
    );
  });

  it("preserves column count and row count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 15 }),
        (nCols, nRows) => {
          const data: Record<string, number[]> = {};
          for (let c = 0; c < nCols; c++) {
            data[`c${c}`] = Array.from({ length: nRows }, (_, i) => i);
          }
          const df = DataFrame.fromColumns(data);
          const rt = roundTrip(df);
          expect(rt.shape[0]).toBe(nRows);
          expect(rt.shape[1]).toBe(nCols);
        },
      ),
      { numRuns: 30 },
    );
  });
});
