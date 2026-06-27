/**
 * TypeScript interface for the tsb WASM acceleration module.
 *
 * These declarations mirror the Rust functions exported from
 * `rust/src/searchsorted.rs` and `rust/src/natsort.rs`.
 *
 * This file is the authoritative contract between the Rust implementation
 * and the TypeScript glue layer.
 */

/** The tsb Rust/WASM module interface. */
export interface TsbWasmModule {
  // ── searchsorted / argsort ──────────────────────────────────────────────────

  /**
   * Binary-search a sorted Float64Array for `value`.
   * `sideRight = false` → leftmost insertion point ("left").
   * `sideRight = true`  → rightmost insertion point ("right").
   * NaN values are treated as greater than all non-NaN values.
   */
  readonly searchsorted_f64: (arr: Float64Array, value: number, side_right: boolean) => number;

  /**
   * Binary-search a sorted Float64Array for each value in `values`.
   * Returns a Uint32Array of insertion positions.
   */
  readonly searchsorted_many_f64: (
    arr: Float64Array,
    values: Float64Array,
    side_right: boolean,
  ) => Uint32Array;

  /**
   * Return the indices that would sort `arr` in ascending f64 order.
   * NaN values are placed last.
   */
  readonly argsort_f64: (arr: Float64Array) => Uint32Array;

  /**
   * Binary-search a sorted string array for `value`.
   * `sideRight = false` → leftmost; `sideRight = true` → rightmost.
   */
  readonly searchsorted_str: (arr: string[], value: string, side_right: boolean) => number;

  /**
   * Binary-search a sorted string array for each value in `values`.
   * Returns a Uint32Array of insertion positions.
   */
  readonly searchsorted_many_str: (
    arr: string[],
    values: string[],
    side_right: boolean,
  ) => Uint32Array;

  /** Return the indices that would sort a string array lexicographically. */
  readonly argsort_str: (arr: string[]) => Uint32Array;

  // ── natsort ─────────────────────────────────────────────────────────────────

  /**
   * Compare two strings using natural order.
   * Returns < 0 when a < b, 0 when a == b, > 0 when a > b.
   * `ignoreCase`: fold text tokens to lower-case.
   * `reverse`: invert the result.
   */
  readonly nat_compare: (a: string, b: string, ignore_case: boolean, reverse: boolean) => number;

  /**
   * Sort a string array in natural order and return the sorted copy.
   * `ignoreCase`: fold text tokens to lower-case.
   * `reverse`: sort in descending natural order.
   */
  readonly nat_sorted: (arr: string[], ignore_case: boolean, reverse: boolean) => string[];

  /**
   * Return the indices that would sort a string array in natural order.
   */
  readonly nat_argsort: (arr: string[], ignore_case: boolean, reverse: boolean) => Uint32Array;
}
