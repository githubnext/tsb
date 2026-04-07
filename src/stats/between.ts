/**
 * between — element-wise interval membership test for Series.
 *
 * Mirrors `pandas.Series.between(left, right, inclusive="both")`.
 *
 * Returns a boolean `Series` of the same length, where each element is `true`
 * if the corresponding value falls within the interval `[left, right]`
 * (boundaries determined by the `inclusive` option).
 *
 * **Missing-value behaviour (matches pandas):** `null`, `undefined`, and `NaN`
 * always yield `false` — they do not fall inside any interval.
 *
 * **Non-numeric behaviour:** string, boolean, bigint, and `Date` values are
 * compared using JavaScript's `<=` / `<` operators where meaningful, but in
 * practice `between` is most useful with numeric Series.
 *
 * @module
 *
 * @example
 * ```ts
 * import { between } from "tsb";
 * import { Series } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5], name: "x" });
 *
 * between(s, 2, 4).values;
 * // [false, true, true, true, false]  (inclusive="both")
 *
 * between(s, 2, 4, { inclusive: "neither" }).values;
 * // [false, false, true, false, false]
 *
 * between(s, 2, 4, { inclusive: "left" }).values;
 * // [false, true, true, false, false]
 *
 * between(s, 2, 4, { inclusive: "right" }).values;
 * // [false, false, true, true, false]
 *
 * // Missing values yield false
 * const s2 = new Series({ data: [1, null, NaN, 3], name: "y" });
 * between(s2, 0, 5).values;
 * // [true, false, false, true]
 * ```
 */

import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Which endpoints of the interval to include.
 *
 * | Value       | Condition              |
 * |-------------|------------------------|
 * | `"both"`    | `left <= x <= right`   |
 * | `"neither"` | `left < x < right`     |
 * | `"left"`    | `left <= x < right`    |
 * | `"right"`   | `left < x <= right`    |
 *
 * Default: `"both"`.
 */
export type BetweenInclusive = "both" | "neither" | "left" | "right";

/** Options for {@link between}. */
export interface BetweenOptions {
  /**
   * Which endpoints of the interval to include.
   * @default "both"
   */
  inclusive?: BetweenInclusive;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is missing — null, undefined, or NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Check the left boundary condition.
 * Returns `true` when the value satisfies the left constraint.
 */
function checkLeft(v: Scalar, left: Scalar, inclusive: BetweenInclusive): boolean {
  if (inclusive === "both" || inclusive === "left") {
    // v >= left
    return (v as number) >= (left as number);
  }
  // v > left
  return (v as number) > (left as number);
}

/**
 * Check the right boundary condition.
 * Returns `true` when the value satisfies the right constraint.
 */
function checkRight(v: Scalar, right: Scalar, inclusive: BetweenInclusive): boolean {
  if (inclusive === "both" || inclusive === "right") {
    // v <= right
    return (v as number) <= (right as number);
  }
  // v < right
  return (v as number) < (right as number);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Return a boolean `Series` indicating whether each value lies within the
 * interval `[left, right]`.
 *
 * Equivalent to `pandas.Series.between(left, right, inclusive)`.
 *
 * @param series - The input Series.
 * @param left   - Left bound of the interval.
 * @param right  - Right bound of the interval.
 * @param options - See {@link BetweenOptions}.
 * @returns A boolean Series of the same length and index as `series`.
 *
 * @example
 * ```ts
 * import { between } from "tsb";
 * import { Series } from "tsb";
 *
 * const s = new Series({ data: [0, 1, 2, 3, 4], name: "n" });
 * between(s, 1, 3).values; // [false, true, true, true, false]
 * ```
 */
export function between(
  series: Series<Scalar>,
  left: Scalar,
  right: Scalar,
  options: BetweenOptions = {},
): Series<boolean> {
  const { inclusive = "both" } = options;

  // Missing bounds mean nothing can be "between" them.
  if (isMissing(left) || isMissing(right)) {
    const falseData = new Array<boolean>(series.values.length).fill(false);
    return new Series<boolean>({ data: falseData, index: series.index, name: series.name });
  }

  const result: boolean[] = series.values.map((v): boolean => {
    if (isMissing(v)) return false;
    return checkLeft(v, left, inclusive) && checkRight(v, right, inclusive);
  });

  return new Series<boolean>({ data: result, index: series.index, name: series.name });
}
