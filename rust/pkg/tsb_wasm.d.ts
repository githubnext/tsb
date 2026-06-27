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
