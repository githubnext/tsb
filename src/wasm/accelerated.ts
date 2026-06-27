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
