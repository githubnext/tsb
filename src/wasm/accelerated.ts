/**
 * Accelerated public API — TypeScript wrappers that delegate to Rust/WASM
 * when the module is available and fall back to the pure-TypeScript
 * implementations otherwise.
 *
 * This module is the integration point between the TypeScript tsb public API
 * and the optional Rust/WASM acceleration layer.
 */

import {
  argsortScalars as tsAS,
  natArgSort as tsNA,
  natCompare as tsNC,
  natSorted as tsNS,
  searchsortedMany as tsSMMany,
  searchsorted as tsSS,
} from "../core/index.ts";
import type { NatSortOptions, SearchSortedSide } from "../core/index.ts";
import type { Scalar } from "../types.ts";

import { getWasm } from "./loader.ts";
export { getWasm, loadWasm } from "./loader.ts";

// ─── searchsorted accelerated helpers ────────────────────────────────────────

/**
 * Detect whether `arr` is a plain numeric array (no NaN-unsafe values, all
 * numbers) that can be forwarded to the f64 WASM path.
 */
function isNumericArray(arr: readonly Scalar[]): arr is readonly number[] {
  return arr.every((v) => typeof v === "number");
}

/** Detect a plain string-only array. */
function isStringArray(arr: readonly Scalar[]): arr is readonly string[] {
  return arr.every((v) => typeof v === "string");
}

/**
 * Accelerated `searchsorted` for numeric or string arrays without a custom
 * compareFn. Falls back to the TypeScript implementation for other types,
 * mixed arrays, or when a custom `compareFn` is supplied.
 */
export function searchsortedAccelerated(
  a: readonly Scalar[],
  v: Scalar,
  side: SearchSortedSide = "left",
): number {
  const wasm = getWasm();
  const sideRight = side === "right";
  if (wasm !== null) {
    if (typeof v === "number" && isNumericArray(a)) {
      return wasm.searchsorted_f64(new Float64Array(a), v, sideRight);
    }
    if (typeof v === "string" && isStringArray(a)) {
      return wasm.searchsorted_str([...a], v, sideRight);
    }
  }
  return tsSS(a, v, { side });
}

/**
 * Accelerated `searchsortedMany` for numeric or string arrays without a
 * custom compareFn. Falls back to TypeScript for other cases.
 */
export function searchsortedManyAccelerated(
  a: readonly Scalar[],
  vs: readonly Scalar[],
  side: SearchSortedSide = "left",
): number[] {
  const wasm = getWasm();
  const sideRight = side === "right";
  if (wasm !== null) {
    if (isNumericArray(a) && isNumericArray(vs)) {
      return Array.from(
        wasm.searchsorted_many_f64(new Float64Array(a), new Float64Array(vs), sideRight),
      );
    }
    if (isStringArray(a) && isStringArray(vs)) {
      return Array.from(wasm.searchsorted_many_str([...a], [...vs], sideRight));
    }
  }
  return tsSMMany(a, vs, { side });
}

/**
 * Accelerated `argsortScalars` for numeric or string arrays using the default
 * compareFn. Falls back to TypeScript for custom comparators or mixed types.
 */
export function argsortScalarsAccelerated(a: readonly Scalar[]): number[] {
  const wasm = getWasm();
  if (wasm !== null) {
    if (isNumericArray(a)) {
      return Array.from(wasm.argsort_f64(new Float64Array(a)));
    }
    if (isStringArray(a)) {
      return Array.from(wasm.argsort_str([...a]));
    }
  }
  return tsAS(a);
}

// ─── natsort accelerated helpers ─────────────────────────────────────────────

/**
 * Accelerated `natCompare`. Falls back to TypeScript implementation if the
 * WASM module is not loaded.
 */
export function natCompareAccelerated(a: string, b: string, opts: NatSortOptions = {}): number {
  const wasm = getWasm();
  if (wasm !== null) {
    return wasm.nat_compare(a, b, opts.ignoreCase ?? false, opts.reverse ?? false);
  }
  return tsNC(a, b, opts);
}

/**
 * Accelerated `natSorted` for string arrays without a `key` function.
 * For generic arrays with a key function, falls back to TypeScript.
 */
export function natSortedAccelerated(arr: readonly string[], opts: NatSortOptions = {}): string[] {
  const wasm = getWasm();
  if (wasm !== null) {
    return wasm.nat_sorted([...arr], opts.ignoreCase ?? false, opts.reverse ?? false);
  }
  return tsNS(arr, opts);
}

/**
 * Accelerated `natArgSort` for string arrays.
 * Falls back to TypeScript if the WASM module is unavailable.
 */
export function natArgSortAccelerated(arr: readonly string[], opts: NatSortOptions = {}): number[] {
  const wasm = getWasm();
  if (wasm !== null) {
    return Array.from(wasm.nat_argsort([...arr], opts.ignoreCase ?? false, opts.reverse ?? false));
  }
  return tsNA(arr, opts);
}

// ─── scalar reduction accelerated helpers ─────────────────────────────────────

/**
 * Accelerated sum of a numeric array (non-NaN values only).
 * Matches `Series.sum()` semantics: returns `0` for empty input.
 * Falls back to a TypeScript loop if WASM is unavailable.
 */
export function sumF64Accelerated(nums: readonly number[]): number {
  const wasm = getWasm();
  if (wasm !== null) {
    return wasm.sum_f64(new Float64Array(nums));
  }
  let acc = 0;
  for (const v of nums) {
    if (!Number.isNaN(v)) acc += v;
  }
  return acc;
}

/**
 * Accelerated arithmetic mean (non-NaN values). Returns `NaN` for empty input.
 * Falls back to TypeScript when WASM is unavailable.
 */
export function meanF64Accelerated(nums: readonly number[]): number {
  const wasm = getWasm();
  if (wasm !== null) {
    return wasm.mean_f64(new Float64Array(nums));
  }
  let acc = 0;
  let count = 0;
  for (const v of nums) {
    if (!Number.isNaN(v)) {
      acc += v;
      count++;
    }
  }
  return count === 0 ? Number.NaN : acc / count;
}

/**
 * Accelerated minimum (non-NaN values). Returns `NaN` for empty input.
 */
export function minF64Accelerated(nums: readonly number[]): number {
  const wasm = getWasm();
  if (wasm !== null) {
    return wasm.min_f64(new Float64Array(nums));
  }
  let result = Number.NaN;
  for (const v of nums) {
    if (!Number.isNaN(v) && (Number.isNaN(result) || v < result)) result = v;
  }
  return result;
}

/**
 * Accelerated maximum (non-NaN values). Returns `NaN` for empty input.
 */
export function maxF64Accelerated(nums: readonly number[]): number {
  const wasm = getWasm();
  if (wasm !== null) {
    return wasm.max_f64(new Float64Array(nums));
  }
  let result = Number.NaN;
  for (const v of nums) {
    if (!Number.isNaN(v) && (Number.isNaN(result) || v > result)) result = v;
  }
  return result;
}

/**
 * Accelerated sample variance with delta degrees-of-freedom `ddof`.
 * Returns `NaN` when fewer than `ddof + 1` valid values exist.
 */
export function varF64Accelerated(nums: readonly number[], ddof = 1): number {
  const wasm = getWasm();
  if (wasm !== null) {
    return wasm.var_f64(new Float64Array(nums), ddof);
  }
  const valid = nums.filter((v) => !Number.isNaN(v));
  const n = valid.length;
  if (n < ddof + 1) return Number.NaN;
  const mu = valid.reduce((s, v) => s + v, 0) / n;
  return valid.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - ddof);
}

/**
 * Accelerated sample standard deviation with delta degrees-of-freedom `ddof`.
 */
export function stdF64Accelerated(nums: readonly number[], ddof = 1): number {
  const wasm = getWasm();
  if (wasm !== null) {
    return wasm.std_f64(new Float64Array(nums), ddof);
  }
  return Math.sqrt(varF64Accelerated(nums, ddof));
}

/**
 * Accelerated median (non-NaN values, middle or average of two middles).
 * Returns `NaN` for empty input.
 */
export function medianF64Accelerated(nums: readonly number[]): number {
  const wasm = getWasm();
  if (wasm !== null) {
    return wasm.median_f64(new Float64Array(nums));
  }
  const sorted = nums.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  const mid = Math.floor(n / 2);
  const midVal = sorted[mid] ?? Number.NaN;
  const lo = sorted[mid - 1] ?? Number.NaN;
  return n % 2 === 1 ? midVal : (lo + midVal) / 2;
}

// ─── rolling window accelerated helpers ───────────────────────────────────────

/** Convert a Float64Array (NaN = missing) to nullable number[]. */
function f64ArrayToNullable(arr: Float64Array): (number | null)[] {
  return Array.from(arr, (v) => (Number.isNaN(v) ? null : v));
}

/**
 * Accelerated rolling sum. Returns an array where positions with fewer than
 * `minPeriods` non-NaN values in the window are `null`.
 */
export function rollingSumF64Accelerated(
  data: readonly number[],
  window: number,
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.rolling_sum_f64(input, window, minPeriods));
  }
  return rollingFallback(data, window, minPeriods, (w) => w.reduce((a, v) => a + v, 0));
}

/**
 * Accelerated rolling mean.
 */
export function rollingMeanF64Accelerated(
  data: readonly number[],
  window: number,
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.rolling_mean_f64(input, window, minPeriods));
  }
  return rollingFallback(data, window, minPeriods, (w) => w.reduce((a, v) => a + v, 0) / w.length);
}

/**
 * Accelerated rolling minimum.
 */
export function rollingMinF64Accelerated(
  data: readonly number[],
  window: number,
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.rolling_min_f64(input, window, minPeriods));
  }
  return rollingFallback(data, window, minPeriods, (w) => Math.min(...w));
}

/**
 * Accelerated rolling maximum.
 */
export function rollingMaxF64Accelerated(
  data: readonly number[],
  window: number,
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.rolling_max_f64(input, window, minPeriods));
  }
  return rollingFallback(data, window, minPeriods, (w) => Math.max(...w));
}

/**
 * Accelerated rolling variance (delta degrees-of-freedom `ddof`).
 */
export function rollingVarF64Accelerated(
  data: readonly number[],
  window: number,
  minPeriods: number,
  ddof = 1,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.rolling_var_f64(input, window, minPeriods, ddof));
  }
  return rollingFallback(data, window, minPeriods, (w) => {
    const n = w.length;
    if (n <= ddof) return Number.NaN;
    const mu = w.reduce((s, v) => s + v, 0) / n;
    return w.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - ddof);
  });
}

/**
 * Accelerated rolling standard deviation (delta degrees-of-freedom `ddof`).
 */
export function rollingStdF64Accelerated(
  data: readonly number[],
  window: number,
  minPeriods: number,
  ddof = 1,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.rolling_std_f64(input, window, minPeriods, ddof));
  }
  return rollingFallback(data, window, minPeriods, (w) => {
    const n = w.length;
    if (n <= ddof) return Number.NaN;
    const mu = w.reduce((s, v) => s + v, 0) / n;
    return Math.sqrt(w.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - ddof));
  });
}

/**
 * Accelerated rolling median.
 */
export function rollingMedianF64Accelerated(
  data: readonly number[],
  window: number,
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.rolling_median_f64(input, window, minPeriods));
  }
  return rollingFallback(data, window, minPeriods, (w) => {
    const s = [...w].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 1
      ? (s[mid] as number)
      : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
  });
}

// ─── expanding window accelerated helpers ─────────────────────────────────────

/**
 * Accelerated expanding sum.
 */
export function expandingSumF64Accelerated(
  data: readonly number[],
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.expanding_sum_f64(input, minPeriods));
  }
  return rollingFallback(data, data.length, minPeriods, (w) => w.reduce((a, v) => a + v, 0), true);
}

/**
 * Accelerated expanding mean.
 */
export function expandingMeanF64Accelerated(
  data: readonly number[],
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.expanding_mean_f64(input, minPeriods));
  }
  const meanFn = (w: number[]) => w.reduce((a, v) => a + v, 0) / w.length;
  return rollingFallback(data, data.length, minPeriods, meanFn, true);
}

/**
 * Accelerated expanding minimum.
 */
export function expandingMinF64Accelerated(
  data: readonly number[],
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.expanding_min_f64(input, minPeriods));
  }
  return rollingFallback(data, data.length, minPeriods, (w) => Math.min(...w), true);
}

/**
 * Accelerated expanding maximum.
 */
export function expandingMaxF64Accelerated(
  data: readonly number[],
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.expanding_max_f64(input, minPeriods));
  }
  return rollingFallback(data, data.length, minPeriods, (w) => Math.max(...w), true);
}

/**
 * Accelerated expanding variance.
 */
export function expandingVarF64Accelerated(
  data: readonly number[],
  minPeriods: number,
  ddof = 1,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.expanding_var_f64(input, minPeriods, ddof));
  }
  return rollingFallback(
    data,
    data.length,
    minPeriods,
    (w) => {
      const n = w.length;
      if (n <= ddof) return Number.NaN;
      const mu = w.reduce((s, v) => s + v, 0) / n;
      return w.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - ddof);
    },
    true,
  );
}

/**
 * Accelerated expanding standard deviation.
 */
export function expandingStdF64Accelerated(
  data: readonly number[],
  minPeriods: number,
  ddof = 1,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.expanding_std_f64(input, minPeriods, ddof));
  }
  return rollingFallback(
    data,
    data.length,
    minPeriods,
    (w) => {
      const n = w.length;
      if (n <= ddof) return Number.NaN;
      const mu = w.reduce((s, v) => s + v, 0) / n;
      return Math.sqrt(w.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - ddof));
    },
    true,
  );
}

/**
 * Accelerated expanding median.
 */
export function expandingMedianF64Accelerated(
  data: readonly number[],
  minPeriods: number,
): (number | null)[] {
  const wasm = getWasm();
  if (wasm !== null) {
    const input = Float64Array.from(data, (v) => (v === null || v === undefined ? Number.NaN : v));
    return f64ArrayToNullable(wasm.expanding_median_f64(input, minPeriods));
  }
  return rollingFallback(
    data,
    data.length,
    minPeriods,
    (w) => {
      const s = [...w].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 === 1
        ? (s[mid] as number)
        : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
    },
    true,
  );
}

// ─── rolling fallback helper ──────────────────────────────────────────────────

/** TypeScript fallback for rolling/expanding aggregations. */
function rollingFallback(
  data: readonly number[],
  window: number,
  minPeriods: number,
  agg: (window: number[]) => number,
  expanding = false,
): (number | null)[] {
  return data.map((_, i) => {
    const start = expanding ? 0 : Math.max(0, i + 1 - window);
    const slice = data.slice(start, i + 1).filter((v) => !Number.isNaN(v));
    if (slice.length < minPeriods) return null;
    const result = agg(slice);
    return Number.isNaN(result) ? null : result;
  });
}
