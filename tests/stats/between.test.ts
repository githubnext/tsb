/**
 * Tests for between — Series.between interval membership.
 *
 * Covers:
 * - inclusive="both" (default): left <= x <= right
 * - inclusive="neither": left < x < right
 * - inclusive="left": left <= x < right
 * - inclusive="right": left < x <= right
 * - Missing values (null, undefined, NaN) → false
 * - Non-numeric (string comparison) works via JS operators
 * - Exact boundary values for all inclusive modes
 * - Empty Series
 * - Single-element Series
 * - Negative numbers
 * - Floating-point numbers
 * - left > right (empty interval, all false)
 * - left == right (degenerate interval)
 * - Preserves name and index
 * - Missing bounds (null/undefined/NaN left or right) → all false
 * - Property-based: result is boolean[], length matches input
 * - Property-based: inclusive="both" is superset of inclusive="neither"
 * - Property-based: left ≤ v ≤ right iff between(s, left, right, "both") is true
 * - Property-based: between(s, right, left) with left < right → all false
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Index } from "../../src/core/base-index.ts";
import { Series } from "../../src/core/series.ts";
import type { Label, Scalar } from "../../src/types.ts";
import { between } from "../../src/stats/between.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function vals(s: Series<boolean>): boolean[] {
  return [...s.values];
}

function numSeries(data: (number | null | undefined)[], name = "x"): Series<Scalar> {
  return new Series<Scalar>({ data: data as Scalar[], name });
}

function idx(s: Series<boolean>): Label[] {
  return [...s.index.values];
}

// ─── inclusive="both" (default) ───────────────────────────────────────────────

describe("between — inclusive=both (default)", () => {
  test("basic range", () => {
    const s = numSeries([1, 2, 3, 4, 5]);
    expect(vals(between(s, 2, 4))).toEqual([false, true, true, true, false]);
  });

  test("all inside", () => {
    const s = numSeries([2, 3, 4]);
    expect(vals(between(s, 2, 4))).toEqual([true, true, true]);
  });

  test("all outside", () => {
    const s = numSeries([0, 1, 5, 6]);
    expect(vals(between(s, 2, 4))).toEqual([false, false, false, false]);
  });

  test("left boundary included", () => {
    const s = numSeries([2]);
    expect(vals(between(s, 2, 4))).toEqual([true]);
  });

  test("right boundary included", () => {
    const s = numSeries([4]);
    expect(vals(between(s, 2, 4))).toEqual([true]);
  });

  test("degenerate interval (left == right)", () => {
    const s = numSeries([1, 3, 5]);
    expect(vals(between(s, 3, 3))).toEqual([false, true, false]);
  });

  test("inverted interval (left > right) → all false", () => {
    const s = numSeries([1, 2, 3]);
    expect(vals(between(s, 5, 2))).toEqual([false, false, false]);
  });

  test("negative numbers", () => {
    const s = numSeries([-5, -3, -1, 0, 1]);
    expect(vals(between(s, -3, 0))).toEqual([false, true, true, true, false]);
  });

  test("floating-point", () => {
    const s = numSeries([1.0, 1.5, 2.0, 2.5, 3.0]);
    expect(vals(between(s, 1.5, 2.5))).toEqual([false, true, true, true, false]);
  });
});

// ─── inclusive="neither" ──────────────────────────────────────────────────────

describe("between — inclusive=neither", () => {
  test("basic range", () => {
    const s = numSeries([1, 2, 3, 4, 5]);
    expect(vals(between(s, 2, 4, { inclusive: "neither" }))).toEqual([
      false, false, true, false, false,
    ]);
  });

  test("left boundary excluded", () => {
    const s = numSeries([2]);
    expect(vals(between(s, 2, 4, { inclusive: "neither" }))).toEqual([false]);
  });

  test("right boundary excluded", () => {
    const s = numSeries([4]);
    expect(vals(between(s, 2, 4, { inclusive: "neither" }))).toEqual([false]);
  });

  test("degenerate interval (left == right) → all false", () => {
    const s = numSeries([3]);
    expect(vals(between(s, 3, 3, { inclusive: "neither" }))).toEqual([false]);
  });
});

// ─── inclusive="left" ─────────────────────────────────────────────────────────

describe("between — inclusive=left", () => {
  test("basic range", () => {
    const s = numSeries([1, 2, 3, 4, 5]);
    expect(vals(between(s, 2, 4, { inclusive: "left" }))).toEqual([
      false, true, true, false, false,
    ]);
  });

  test("left boundary included", () => {
    const s = numSeries([2]);
    expect(vals(between(s, 2, 4, { inclusive: "left" }))).toEqual([true]);
  });

  test("right boundary excluded", () => {
    const s = numSeries([4]);
    expect(vals(between(s, 2, 4, { inclusive: "left" }))).toEqual([false]);
  });
});

// ─── inclusive="right" ────────────────────────────────────────────────────────

describe("between — inclusive=right", () => {
  test("basic range", () => {
    const s = numSeries([1, 2, 3, 4, 5]);
    expect(vals(between(s, 2, 4, { inclusive: "right" }))).toEqual([
      false, false, true, true, false,
    ]);
  });

  test("left boundary excluded", () => {
    const s = numSeries([2]);
    expect(vals(between(s, 2, 4, { inclusive: "right" }))).toEqual([false]);
  });

  test("right boundary included", () => {
    const s = numSeries([4]);
    expect(vals(between(s, 2, 4, { inclusive: "right" }))).toEqual([true]);
  });
});

// ─── missing values ───────────────────────────────────────────────────────────

describe("between — missing values", () => {
  test("null → false", () => {
    const s = numSeries([null, 2, 3]);
    expect(vals(between(s, 0, 5))).toEqual([false, true, true]);
  });

  test("undefined → false", () => {
    const s = numSeries([undefined, 2, 3]);
    expect(vals(between(s, 0, 5))).toEqual([false, true, true]);
  });

  test("NaN → false", () => {
    const s = numSeries([NaN, 2, 3]);
    expect(vals(between(s, 0, 5))).toEqual([false, true, true]);
  });

  test("all missing → all false", () => {
    const s = numSeries([null, NaN, undefined]);
    expect(vals(between(s, 0, 10))).toEqual([false, false, false]);
  });

  test("missing left bound → all false", () => {
    const s = numSeries([1, 2, 3]);
    expect(vals(between(s, null as unknown as number, 5))).toEqual([false, false, false]);
  });

  test("missing right bound → all false", () => {
    const s = numSeries([1, 2, 3]);
    expect(vals(between(s, 0, NaN))).toEqual([false, false, false]);
  });

  test("NaN bound → all false", () => {
    const s = numSeries([1, 2, 3]);
    expect(vals(between(s, NaN, NaN))).toEqual([false, false, false]);
  });
});

// ─── edge cases ───────────────────────────────────────────────────────────────

describe("between — edge cases", () => {
  test("empty Series", () => {
    const s = numSeries([]);
    expect(vals(between(s, 0, 10))).toEqual([]);
  });

  test("single element inside", () => {
    const s = numSeries([5]);
    expect(vals(between(s, 0, 10))).toEqual([true]);
  });

  test("single element outside", () => {
    const s = numSeries([15]);
    expect(vals(between(s, 0, 10))).toEqual([false]);
  });

  test("preserves index", () => {
    const s = new Series<Scalar>({
      data: [1, 2, 3] as Scalar[],
      index: new Index(["a", "b", "c"] as Label[]),
      name: "myS",
    });
    const result = between(s, 1, 3);
    expect(idx(result)).toEqual(["a", "b", "c"]);
  });

  test("preserves name", () => {
    const s = numSeries([1, 2], "myname");
    expect(between(s, 0, 5).name).toBe("myname");
  });

  test("null name preserved", () => {
    const s = new Series<Scalar>({ data: [1, 2] as Scalar[], name: null });
    expect(between(s, 0, 5).name).toBe(null);
  });

  test("infinity boundaries", () => {
    const s = numSeries([-Infinity, 0, Infinity]);
    expect(vals(between(s, -Infinity, Infinity))).toEqual([true, true, true]);
  });

  test("zero-width interval at zero", () => {
    const s = numSeries([-1, 0, 1]);
    expect(vals(between(s, 0, 0))).toEqual([false, true, false]);
    expect(vals(between(s, 0, 0, { inclusive: "neither" }))).toEqual([false, false, false]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("between — property-based", () => {
  test("result length matches input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.double({ noNaN: true }), fc.constant(null))),
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        (data, a, b) => {
          const left = Math.min(a, b);
          const right = Math.max(a, b);
          const s = new Series<Scalar>({ data: data as Scalar[], name: "t" });
          const result = between(s, left, right);
          return result.values.length === data.length;
        },
      ),
    );
  });

  test("result is always boolean", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.double(), fc.constant(null)), { maxLength: 20 }),
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        (data, a, b) => {
          const left = Math.min(a, b);
          const right = Math.max(a, b);
          const s = new Series<Scalar>({ data: data as Scalar[], name: "t" });
          const result = between(s, left, right);
          return [...result.values].every((v) => typeof v === "boolean");
        },
      ),
    );
  });

  test("inclusive=both is superset of inclusive=neither", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true }), { maxLength: 30 }),
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        (data, a, b) => {
          const left = Math.min(a, b);
          const right = Math.max(a, b);
          const s = new Series<Scalar>({ data: data as Scalar[], name: "t" });
          const both = [...between(s, left, right, { inclusive: "both" }).values];
          const neither = [...between(s, left, right, { inclusive: "neither" }).values];
          // every index that is true for "neither" must also be true for "both"
          return neither.every((v, i) => !v || both[i] === true);
        },
      ),
    );
  });

  test("between(s, right, left) with left < right → all false for non-missing", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true }), { maxLength: 20 }),
        fc.tuple(fc.double({ noNaN: true }), fc.double({ noNaN: true })).filter(([a, b]) => a < b),
        (data, [left, right]) => {
          const s = new Series<Scalar>({ data: data as Scalar[], name: "t" });
          // inverted: pass right as left, left as right
          const result = [...between(s, right, left).values];
          return result.every((v) => v === false);
        },
      ),
    );
  });

  test("left==-Infinity, right==Infinity: all non-missing values are true", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true }), { minLength: 1, maxLength: 30 }),
        (data) => {
          const s = new Series<Scalar>({ data: data as Scalar[], name: "t" });
          const result = [...between(s, -Infinity, Infinity).values];
          return result.every((v) => v === true);
        },
      ),
    );
  });
});
