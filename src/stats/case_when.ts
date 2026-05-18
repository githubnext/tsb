/**
 * case_when — conditional value selection using CASE WHEN semantics.
 *
 * Mirrors `pandas.Series.case_when(caselist)` (added in pandas 2.2):
 *
 * - {@link caseWhen} — apply an ordered list of (condition, replacement) pairs
 *   to a Series, returning a new Series where each element is set to the
 *   replacement from the **first** matching condition.  If no condition
 *   matches for a given row the original value is kept.
 *
 * ### Semantics
 *
 * ```
 * for i in range(len(series)):
 *   for (cond, replacement) in caselist:
 *     if cond[i] is true:
 *       result[i] = replacement[i]   # or scalar
 *       break
 *   else:
 *     result[i] = series[i]          # default: keep original
 * ```
 *
 * This is equivalent to a SQL `CASE WHEN … THEN … WHEN … THEN … ELSE … END`
 * expression.
 *
 * @example
 * ```ts
 * import { Series, caseWhen } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * const result = caseWhen(s, [
 *   [s.map(v => (v as number) < 2), "small"],
 *   [s.map(v => (v as number) < 4), "medium"],
 * ]);
 * // result: ["small", "medium", "medium", 4, 5]
 * ```
 *
 * @module
 */

import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * A predicate function that receives the element value and positional index
 * and returns `true` when the condition is satisfied.
 */
export type CaseWhenPredicate = (value: Scalar, idx: number) => boolean;

/**
 * A single branch in a `caselist`.
 *
 * - `condition` — a boolean `Series`, an array of booleans, or a predicate
 *   function `(value, index) => boolean`.
 * - `replacement` — the value to use when `condition` is true.  May be a
 *   scalar, a `Series`, or a plain array.  When a `Series` or array is
 *   supplied the value at the matching position is used.
 */
export type CaseWhenBranch = [
  condition: Series<boolean> | readonly boolean[] | CaseWhenPredicate,
  replacement: Scalar | Series<Scalar> | readonly Scalar[],
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function isBoolSeriesGuard(
  v: Series<boolean> | readonly boolean[] | CaseWhenPredicate,
): v is Series<boolean> {
  return v instanceof Series;
}

function isReplSeries(
  v: Scalar | Series<Scalar> | readonly Scalar[],
): v is Series<Scalar> {
  return v instanceof Series;
}

function isReplArray(
  v: Scalar | Series<Scalar> | readonly Scalar[],
): v is readonly Scalar[] {
  return Array.isArray(v);
}

// ─── internal resolved branch type ───────────────────────────────────────────

type ResolvedCond = readonly (boolean | undefined)[] | CaseWhenPredicate;
type ResolvedRepl = readonly Scalar[] | Scalar;

type ResolvedBranch = {
  readonly cond: ResolvedCond;
  readonly repl: ResolvedRepl;
};

/**
 * Apply an ordered list of `(condition, replacement)` branches to `series`,
 * returning a new `Series` of the same length.
 *
 * The first condition that is `true` for a given row determines the
 * replacement value; if no condition matches the original value is preserved.
 *
 * @param series      The input Series (any element type).
 * @param caselist    Ordered list of `[condition, replacement]` pairs.
 *
 * @example
 * ```ts
 * import { Series, caseWhen } from "tsb";
 *
 * const score = new Series({ data: [45, 72, 88, 95, 60] });
 * const grade = caseWhen(score, [
 *   [score.map(v => (v as number) >= 90), "A"],
 *   [score.map(v => (v as number) >= 75), "B"],
 *   [score.map(v => (v as number) >= 60), "C"],
 *   [score.map(v => (v as number) >= 45), "D"],
 * ]);
 * // grade: ["D", "C", "B", "A", "C"]
 * ```
 */
export function caseWhen<T extends Scalar = Scalar>(
  series: Series<T>,
  caselist: ReadonlyArray<CaseWhenBranch>,
): Series<Scalar> {
  const n = series.length;
  const srcValues = series.toArray();
  const result: Scalar[] = new Array<Scalar>(n);

  // Pre-convert Series to plain arrays so inner loop avoids repeated toArray() calls.
  const resolved: ResolvedBranch[] = caselist.map(([cond, replacement]) => ({
    cond: isBoolSeriesGuard(cond) ? cond.toArray() : cond,
    repl: isReplSeries(replacement) ? replacement.toArray() : replacement,
  }));

  for (let i = 0; i < n; i++) {
    const original = srcValues[i] ?? null;
    let matched = false;

    for (const branch of resolved) {
      let condTrue: boolean;
      if (typeof branch.cond === "function") {
        condTrue = branch.cond(original, i);
      } else {
        condTrue = (branch.cond[i] ?? false) === true;
      }

      if (condTrue) {
        if (isReplArray(branch.repl)) {
          result[i] = branch.repl[i] ?? null;
        } else {
          result[i] = branch.repl;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      result[i] = original;
    }
  }

  return new Series<Scalar>({ data: result, index: series.index });
}
