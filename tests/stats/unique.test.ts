/**
 * Tests for unique / nunique / dataFrameNunique.
 *
 * Covers:
 * - unique(): basic deduplication in first-appearance order
 * - unique(): missing values (null, undefined, NaN) normalised and deduplicated
 * - unique(): dropna=true excludes missing values
 * - unique(): preserves series name
 * - unique(): empty series
 * - unique(): all same values → single result
 * - unique(): mixed types
 * - unique(): booleans
 * - unique(): strings
 * - unique(): consecutive vs non-consecutive duplicates
 * - nunique(): counts distinct non-missing by default
 * - nunique(): dropna=false counts missing as one distinct
 * - nunique(): empty series
 * - nunique(): all missing
 * - nunique(): NaN and null treated as same missing category
 * - dataFrameNunique(): axis=0 (default) per-column
 * - dataFrameNunique(): axis=1 per-row
 * - dataFrameNunique(): "index" and "columns" string aliases
 * - dataFrameNunique(): dropna=false
 * - dataFrameNunique(): empty DataFrame
 * - Property-based: unique result length ≤ input length
 * - Property-based: all values in unique() are in original values
 * - Property-based: nunique() == unique(s, {dropna:true}).values.length
 * - Property-based: nunique({dropna:false}) ≥ nunique({dropna:true})
 * - Property-based: dataFrameNunique axis=0 series length == ncols
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Index } from "../../src/core/base-index.ts";
import { Series } from "../../src/core/series.ts";
import { DataFrame } from "../../src/core/frame.ts";
import type { Label, Scalar } from "../../src/types.ts";
import {
  unique,
  nunique,
  dataFrameNunique,
} from "../../src/stats/unique.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function s(values: Scalar[], name?: string): Series<Scalar> {
  return new Series<Scalar>({ data: values, name: name ?? null });
}

// ─── unique ───────────────────────────────────────────────────────────────────

describe("unique", () => {
  test("basic deduplication preserves first-appearance order", () => {
    const result = unique(s([3, 1, 2, 1, 3]));
    expect(result.values).toEqual([3, 1, 2]);
  });

  test("empty series returns empty", () => {
    expect(unique(s([])).values).toEqual([]);
  });

  test("all distinct → same order", () => {
    expect(unique(s([7, 2, 5])).values).toEqual([7, 2, 5]);
  });

  test("all same → single value", () => {
    expect(unique(s([4, 4, 4])).values).toEqual([4]);
  });

  test("null is included by default and deduped", () => {
    const result = unique(s([1, null, 2, null]));
    expect(result.values).toEqual([1, null, 2]);
  });

  test("undefined normalised to null", () => {
    const result = unique(s([1, undefined, 2, null]));
    // undefined and null are both missing; they collapse to one entry (null)
    expect(result.values).toEqual([1, null, 2]);
  });

  test("NaN included by default and deduped", () => {
    const result = unique(s([1, NaN, 2, NaN]));
    // NaN is present and should appear once
    expect(result.values[0]).toBe(1);
    expect(Number.isNaN(result.values[1] as number)).toBe(true);
    expect(result.values[2]).toBe(2);
    expect(result.values).toHaveLength(3);
  });

  test("null and NaN both missing — deduped to one entry", () => {
    // null and NaN are both missing sentinels and should de-duplicate to one
    const result = unique(s([null, NaN]));
    // First seen is null
    expect(result.values).toHaveLength(1);
    expect(result.values[0]).toBeNull();
  });

  test("dropna=true excludes null", () => {
    expect(unique(s([1, null, 2, null]), { dropna: true }).values).toEqual([1, 2]);
  });

  test("dropna=true excludes NaN", () => {
    const result = unique(s([1, NaN, 2, NaN]), { dropna: true });
    expect(result.values).toEqual([1, 2]);
  });

  test("preserves series name", () => {
    const result = unique(s([1, 2, 1], "col_a"));
    expect(result.name).toBe("col_a");
  });

  test("series with no name → null name", () => {
    expect(unique(s([1, 2])).name).toBeNull();
  });

  test("strings deduped", () => {
    expect(unique(s(["b", "a", "b", "c"])).values).toEqual(["b", "a", "c"]);
  });

  test("booleans deduped", () => {
    expect(unique(s([true, false, true])).values).toEqual([true, false]);
  });

  test("non-consecutive duplicates handled", () => {
    expect(unique(s([1, 2, 3, 1, 2, 3])).values).toEqual([1, 2, 3]);
  });

  test("result has RangeIndex of correct length", () => {
    const result = unique(s([3, 1, 2, 1]));
    expect(result.index.size).toBe(3);
  });
});

// ─── nunique ──────────────────────────────────────────────────────────────────

describe("nunique", () => {
  test("basic count", () => {
    expect(nunique(s([1, 2, 2, 3]))).toBe(3);
  });

  test("empty series → 0", () => {
    expect(nunique(s([]))).toBe(0);
  });

  test("all same → 1", () => {
    expect(nunique(s([5, 5, 5]))).toBe(1);
  });

  test("excludes null by default", () => {
    expect(nunique(s([1, 2, null, null]))).toBe(2);
  });

  test("excludes NaN by default", () => {
    expect(nunique(s([1, 2, NaN, NaN]))).toBe(2);
  });

  test("null and NaN both missing: combined exclusion", () => {
    expect(nunique(s([1, null, NaN]))).toBe(1);
  });

  test("dropna=false counts missing as distinct category", () => {
    // null and NaN both collapse to one missing category
    expect(nunique(s([1, 2, null, NaN]), { dropna: false })).toBe(3);
  });

  test("all missing with dropna=true → 0", () => {
    expect(nunique(s([null, null, NaN]))).toBe(0);
  });

  test("all missing with dropna=false → 1 (missing as one category)", () => {
    expect(nunique(s([null, NaN]), { dropna: false })).toBe(1);
  });

  test("strings", () => {
    expect(nunique(s(["a", "b", "a", "c"]))).toBe(3);
  });

  test("booleans", () => {
    expect(nunique(s([true, false, true]))).toBe(2);
  });
});

// ─── dataFrameNunique ─────────────────────────────────────────────────────────

describe("dataFrameNunique", () => {
  function df(cols: Record<string, Scalar[]>): DataFrame {
    return DataFrame.fromColumns(cols);
  }

  test("axis=0 (default): per-column counts", () => {
    const result = dataFrameNunique(df({ a: [1, 2, 2], b: [3, 3, 4] }));
    expect(result.values).toEqual([2, 2]);
    expect(result.index.values).toEqual(["a", "b"]);
  });

  test("axis=0 excludes nulls by default", () => {
    const result = dataFrameNunique(df({ a: [1, null, 1], b: [2, 2, null] }));
    expect(result.values).toEqual([1, 1]);
  });

  test("axis=0 dropna=false counts missing", () => {
    const result = dataFrameNunique(df({ a: [1, null, 1], b: [2, 2, null] }), {
      dropna: false,
    });
    expect(result.values).toEqual([2, 2]);
  });

  test('"index" string alias same as axis=0', () => {
    const a = dataFrameNunique(df({ x: [1, 2, 1] }), { axis: 0 });
    const b = dataFrameNunique(df({ x: [1, 2, 1] }), { axis: "index" });
    expect(a.values).toEqual(b.values);
  });

  test("axis=1: per-row counts", () => {
    const result = dataFrameNunique(df({ a: [1, 2, 2], b: [1, 3, 4] }), { axis: 1 });
    // row 0: {1,1} → 1 unique; row 1: {2,3} → 2; row 2: {2,4} → 2
    expect(result.values).toEqual([1, 2, 2]);
  });

  test('"columns" string alias same as axis=1', () => {
    const a = dataFrameNunique(df({ x: [1, 2], y: [1, 3] }), { axis: 1 });
    const b = dataFrameNunique(df({ x: [1, 2], y: [1, 3] }), { axis: "columns" });
    expect(a.values).toEqual(b.values);
  });

  test("axis=1 excludes nulls by default", () => {
    const result = dataFrameNunique(df({ a: [1, null], b: [null, 2] }), { axis: 1 });
    expect(result.values).toEqual([1, 1]);
  });

  test("axis=1 dropna=false counts missing", () => {
    const result = dataFrameNunique(df({ a: [1, null], b: [null, 2] }), {
      axis: 1,
      dropna: false,
    });
    expect(result.values).toEqual([2, 2]);
  });

  test("single column", () => {
    expect(dataFrameNunique(df({ x: [1, 1, 2] })).values).toEqual([2]);
  });

  test("single row", () => {
    expect(dataFrameNunique(df({ a: [1], b: [1], c: [2] })).values).toEqual([1, 1, 1]);
  });

  test("result length equals number of columns for axis=0", () => {
    const result = dataFrameNunique(df({ a: [1], b: [2], c: [3] }));
    expect(result.values).toHaveLength(3);
  });

  test("result length equals number of rows for axis=1", () => {
    const result = dataFrameNunique(df({ a: [1, 2, 3], b: [4, 5, 6] }), { axis: 1 });
    expect(result.values).toHaveLength(3);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("unique property tests", () => {
  const scalarArb = fc.oneof(
    fc.integer({ min: -10, max: 10 }),
    fc.constantFrom(null as Scalar),
  );

  test("unique result length ≤ input length", () => {
    fc.assert(
      fc.property(fc.array(scalarArb, { maxLength: 20 }), (vals) => {
        const result = unique(s(vals));
        return result.values.length <= vals.length;
      }),
    );
  });

  test("every value in unique() appears in the original series", () => {
    fc.assert(
      fc.property(fc.array(scalarArb, { maxLength: 20 }), (vals) => {
        const result = unique(s(vals));
        const originalNulled = vals.map((v) => (v === null || v === undefined ? null : v));
        for (const uv of result.values) {
          if (!originalNulled.includes(uv as number | null)) return false;
        }
        return true;
      }),
    );
  });

  test("nunique(s) === unique(s, {dropna:true}).values.length", () => {
    fc.assert(
      fc.property(fc.array(scalarArb, { maxLength: 20 }), (vals) => {
        const ser = s(vals);
        return nunique(ser) === unique(ser, { dropna: true }).values.length;
      }),
    );
  });

  test("nunique({dropna:false}) ≥ nunique({dropna:true})", () => {
    fc.assert(
      fc.property(fc.array(scalarArb, { maxLength: 20 }), (vals) => {
        const ser = s(vals);
        return nunique(ser, { dropna: false }) >= nunique(ser);
      }),
    );
  });

  test("dataFrameNunique axis=0 result length equals ncols", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((ncols) =>
          fc.integer({ min: 1, max: 5 }).chain((nrows) =>
            fc
              .array(fc.array(fc.integer({ min: 0, max: 5 }), { minLength: nrows, maxLength: nrows }), {
                minLength: ncols,
                maxLength: ncols,
              })
              .map((cols) => ({ ncols, cols })),
          ),
        ),
        ({ ncols, cols }) => {
          const colObj: Record<string, Scalar[]> = {};
          cols.forEach((col, i) => {
            colObj[`c${i}`] = col;
          });
          const frame = DataFrame.fromColumns(colObj);
          const result = dataFrameNunique(frame);
          return result.values.length === ncols;
        },
      ),
    );
  });
});
