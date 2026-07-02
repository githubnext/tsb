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

  // ── scalar reductions ────────────────────────────────────────────────────────

  /**
   * Sum of non-NaN values in `data`. Returns `0` when all values are NaN
   * or the array is empty, matching `Series.sum()` semantics.
   */
  readonly sum_f64: (data: Float64Array) => number;

  /**
   * Arithmetic mean of non-NaN values. Returns `NaN` for empty / all-NaN
   * input, matching `Series.mean()`.
   */
  readonly mean_f64: (data: Float64Array) => number;

  /**
   * Minimum of non-NaN values. Returns `NaN` for empty / all-NaN input,
   * matching `Series.min()` returning `undefined`.
   */
  readonly min_f64: (data: Float64Array) => number;

  /**
   * Maximum of non-NaN values. Returns `NaN` for empty / all-NaN input.
   */
  readonly max_f64: (data: Float64Array) => number;

  /**
   * Sample variance with delta degrees-of-freedom `ddof`.
   * Returns `NaN` when fewer than `ddof + 1` valid values exist.
   */
  readonly var_f64: (data: Float64Array, ddof: number) => number;

  /**
   * Sample standard deviation with delta degrees-of-freedom `ddof`.
   * Returns `NaN` when fewer than `ddof + 1` valid values exist.
   */
  readonly std_f64: (data: Float64Array, ddof: number) => number;

  /**
   * Median of non-NaN values. Returns `NaN` for empty / all-NaN input.
   */
  readonly median_f64: (data: Float64Array) => number;

  // ── rolling window functions ──────────────────────────────────────────────

  /**
   * Rolling sum. Returns `NaN` at positions with fewer than `min_periods`
   * non-NaN values in the window.
   */
  readonly rolling_sum_f64: (
    data: Float64Array,
    window: number,
    min_periods: number,
  ) => Float64Array;

  /** Rolling arithmetic mean. */
  readonly rolling_mean_f64: (
    data: Float64Array,
    window: number,
    min_periods: number,
  ) => Float64Array;

  /** Rolling minimum. */
  readonly rolling_min_f64: (
    data: Float64Array,
    window: number,
    min_periods: number,
  ) => Float64Array;

  /** Rolling maximum. */
  readonly rolling_max_f64: (
    data: Float64Array,
    window: number,
    min_periods: number,
  ) => Float64Array;

  /** Rolling variance with delta degrees-of-freedom `ddof`. */
  readonly rolling_var_f64: (
    data: Float64Array,
    window: number,
    min_periods: number,
    ddof: number,
  ) => Float64Array;

  /** Rolling standard deviation with delta degrees-of-freedom `ddof`. */
  readonly rolling_std_f64: (
    data: Float64Array,
    window: number,
    min_periods: number,
    ddof: number,
  ) => Float64Array;

  /** Rolling median. */
  readonly rolling_median_f64: (
    data: Float64Array,
    window: number,
    min_periods: number,
  ) => Float64Array;

  // ── expanding window functions ────────────────────────────────────────────

  /** Expanding sum. */
  readonly expanding_sum_f64: (data: Float64Array, min_periods: number) => Float64Array;

  /** Expanding mean. */
  readonly expanding_mean_f64: (data: Float64Array, min_periods: number) => Float64Array;

  /** Expanding minimum. */
  readonly expanding_min_f64: (data: Float64Array, min_periods: number) => Float64Array;

  /** Expanding maximum. */
  readonly expanding_max_f64: (data: Float64Array, min_periods: number) => Float64Array;

  /** Expanding variance with delta degrees-of-freedom `ddof`. */
  readonly expanding_var_f64: (
    data: Float64Array,
    min_periods: number,
    ddof: number,
  ) => Float64Array;

  /** Expanding standard deviation with delta degrees-of-freedom `ddof`. */
  readonly expanding_std_f64: (
    data: Float64Array,
    min_periods: number,
    ddof: number,
  ) => Float64Array;

  /** Expanding median. */
  readonly expanding_median_f64: (data: Float64Array, min_periods: number) => Float64Array;

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
