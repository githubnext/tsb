/* tslint:disable */
/* eslint-disable */

/**
 * Return the indices that would sort `arr` (argsort) for f64 values.
 *
 * NaN values are placed last, matching the TypeScript default comparator.
 */
export function argsort_f64(arr: Float64Array): Uint32Array;

/**
 * Return the indices that would sort `arr` (argsort) for string values.
 */
export function argsort_str(arr: string[]): Uint32Array;

/**
 * Expanding maximum.
 */
export function expanding_max_f64(data: Float64Array, min_periods: number): Float64Array;

/**
 * Expanding mean.
 */
export function expanding_mean_f64(data: Float64Array, min_periods: number): Float64Array;

/**
 * Expanding median.
 */
export function expanding_median_f64(data: Float64Array, min_periods: number): Float64Array;

/**
 * Expanding minimum.
 */
export function expanding_min_f64(data: Float64Array, min_periods: number): Float64Array;

/**
 * Expanding standard deviation (delta degrees-of-freedom `ddof`).
 */
export function expanding_std_f64(data: Float64Array, min_periods: number, ddof: number): Float64Array;

/**
 * Expanding sum.
 */
export function expanding_sum_f64(data: Float64Array, min_periods: number): Float64Array;

/**
 * Expanding variance (delta degrees-of-freedom `ddof`).
 */
export function expanding_var_f64(data: Float64Array, min_periods: number, ddof: number): Float64Array;

/**
 * Maximum of non-NaN values. Returns `NaN` for empty / all-NaN input.
 */
export function max_f64(data: Float64Array): number;

/**
 * Arithmetic mean of non-NaN values. Returns `NaN` for empty / all-NaN input,
 * matching `Series.mean()`.
 */
export function mean_f64(data: Float64Array): number;

/**
 * Median of non-NaN values (middle value of sorted data; average of two
 * middle values for even-length arrays). Returns `NaN` for empty / all-NaN
 * input, matching `Series.median()`.
 */
export function median_f64(data: Float64Array): number;

/**
 * Minimum of non-NaN values. Returns `NaN` for empty / all-NaN input,
 * matching `Series.min()` returning `undefined` (coerced to NaN in numeric
 * contexts).
 */
export function min_f64(data: Float64Array): number;

/**
 * Return the indices that would sort `arr` in natural order.
 */
export function nat_argsort(arr: string[], ignore_case: boolean, reverse: boolean): Uint32Array;

/**
 * Compare two strings using natural order.
 *
 * Returns a negative number when `a < b`, zero when `a == b`, and a positive
 * number when `a > b` (matching the TypeScript contract for a compare
 * function).
 *
 * `ignore_case`: fold text tokens to lower-case before comparing.
 * `reverse`: invert the result.
 */
export function nat_compare(a: string, b: string, ignore_case: boolean, reverse: boolean): number;

/**
 * Sort `arr` of strings in natural order and return the sorted copy.
 *
 * `ignore_case`: fold text tokens to lower-case.
 * `reverse`: sort in descending natural order.
 */
export function nat_sorted(arr: string[], ignore_case: boolean, reverse: boolean): string[];

/**
 * Rolling maximum.
 */
export function rolling_max_f64(data: Float64Array, window: number, min_periods: number): Float64Array;

/**
 * Rolling arithmetic mean.
 */
export function rolling_mean_f64(data: Float64Array, window: number, min_periods: number): Float64Array;

/**
 * Rolling median.
 */
export function rolling_median_f64(data: Float64Array, window: number, min_periods: number): Float64Array;

/**
 * Rolling minimum.
 */
export function rolling_min_f64(data: Float64Array, window: number, min_periods: number): Float64Array;

/**
 * Rolling standard deviation (delta degrees-of-freedom `ddof`).
 */
export function rolling_std_f64(data: Float64Array, window: number, min_periods: number, ddof: number): Float64Array;

/**
 * Rolling sum. Positions with fewer than `min_periods` non-NaN values → NaN.
 */
export function rolling_sum_f64(data: Float64Array, window: number, min_periods: number): Float64Array;

/**
 * Rolling variance (delta degrees-of-freedom `ddof`).
 * Positions with fewer than `ddof + 1` valid values → NaN.
 */
export function rolling_var_f64(data: Float64Array, window: number, min_periods: number, ddof: number): Float64Array;

/**
 * Binary-search a sorted f64 slice for `value`.
 *
 * `side_right = false` returns the leftmost insertion point (equivalent to
 * `side = "left"` in TypeScript); `side_right = true` returns the rightmost
 * (equivalent to `side = "right"`).
 *
 * NaN values are treated as greater than all finite/infinite values, matching
 * the TypeScript `compareNumbers` behaviour.
 */
export function searchsorted_f64(arr: Float64Array, value: number, side_right: boolean): number;

/**
 * Binary-search a sorted f64 slice for each value in `values`, returning an
 * array of insertion positions.
 */
export function searchsorted_many_f64(arr: Float64Array, values: Float64Array, side_right: boolean): Uint32Array;

/**
 * Binary-search a sorted string array for each value in `values`.
 */
export function searchsorted_many_str(arr: string[], values: string[], side_right: boolean): Uint32Array;

/**
 * Binary-search a sorted array of strings for `value`.
 */
export function searchsorted_str(arr: string[], value: string, side_right: boolean): number;

/**
 * Sample standard deviation with delta degrees-of-freedom `ddof`.
 * Returns `NaN` when fewer than `ddof + 1` valid values exist.
 */
export function std_f64(data: Float64Array, ddof: number): number;

/**
 * Sum of non-NaN values. Returns `0.0` when there are no valid values,
 * matching `Series.sum()` on an all-null / empty series.
 */
export function sum_f64(data: Float64Array): number;

/**
 * Sample variance of non-NaN values with delta degrees-of-freedom `ddof`.
 * Returns `NaN` when fewer than `ddof + 1` valid values exist, matching
 * `Series.var(ddof)`.
 */
export function var_f64(data: Float64Array, ddof: number): number;
