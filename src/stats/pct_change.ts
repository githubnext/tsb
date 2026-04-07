/**
 * pct_change — percentage change between elements.
 *
 * Computes the percentage change (relative change) between the current element
 * and the element `periods` positions earlier.  The formula is:
 *
 *   `result[i] = (values[i] - values[i - periods]) / abs(values[i - periods])`
 *
 * This mirrors:
 * - `pandas.Series.pct_change(periods=1)` — element-wise percentage change
 * - `pandas.DataFrame.pct_change(periods=1, axis=0)` — column-wise or row-wise
 *
 * All functions are **pure** — inputs are never mutated.
 *
 * Behavior at boundaries:
 * - The first `abs(periods)` values (for positive periods) are `NaN`.
 * - Missing values (`null`, `undefined`, `NaN`) propagate as `NaN`.
 * - If the prior value is `0`, the result is `Infinity` (or `-Infinity` for
 *   negative current values), matching pandas.
 * - `periods=0` → all `NaN` (dividing by zero — undefined percentage change).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link dataFramePctChange}. */
export interface PctChangeOptions {
  /**
   * Axis along which the percentage change is computed.
   * - `0` / `"index"` (default): compute down each **column**.
   * - `1` / `"columns"`: compute across each **row**.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a finite number (not null / undefined / NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/**
 * Compute percentage-change for a raw value array.
 *
 * @param vals    Input values.
 * @param periods Lag distance (positive → look backward; negative → look forward).
 * @returns       New array of the same length with percentage-change values.
 */
function pctChangeVals(vals: readonly Scalar[], periods: number): number[] {
  const n = vals.length;
  const out = new Array<number>(n).fill(Number.NaN);

  if (periods === 0) {
    // pct_change with periods=0 → undefined (0/0) → NaN everywhere
    return out;
  }

  for (let i = 0; i < n; i++) {
    const cur = vals[i];
    const priorIdx = i - periods;
    if (priorIdx < 0 || priorIdx >= n) {
      continue; // out of range → NaN
    }
    const prior = vals[priorIdx];
    if (!(isFiniteNum(cur) && isFiniteNum(prior))) {
      continue; // missing → NaN
    }
    // (cur - prior) / |prior|; matches pandas behaviour (inf when prior=0)
    out[i] = (cur - prior) / Math.abs(prior);
  }

  return out;
}

// ─── pctChange ────────────────────────────────────────────────────────────────

/**
 * **Percentage change** between consecutive elements of a Series.
 *
 * `result[i] = (values[i] - values[i - periods]) / abs(values[i - periods])`
 *
 * Mirrors `pandas.Series.pct_change(periods)`.
 *
 * @param series  Input Series.
 * @param periods Lag (default `1`).  Positive → backward lag; negative → forward lag.
 * @returns       A new `Series<number>` with the same index and name.
 *
 * @example
 * ```ts
 * import { Series, pctChange } from "tsb";
 * const s = new Series({ data: [100, 110, 99, 108] });
 * pctChange(s).values;     // [NaN, 0.1, -0.1, 0.090...]
 * pctChange(s, 2).values;  // [NaN, NaN, -0.01, -0.018...]
 * pctChange(s, -1).values; // [-0.0909..., 0.1111..., -0.0833..., NaN]
 * ```
 */
export function pctChange(series: Series<Scalar>, periods = 1): Series<number> {
  const result = pctChangeVals(series.values, periods);
  return new Series<number>({ data: result, index: series.index, name: series.name });
}

// ─── dataFramePctChange ───────────────────────────────────────────────────────

/** Apply pct_change column-wise (axis=0) to a DataFrame. */
function pctChangeColWise(df: DataFrame, periods: number): DataFrame {
  const colNames = df.columns.values;
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    const col = df.col(name);
    const result = pctChangeVals(col.values, periods);
    colMap.set(name, new Series<Scalar>({ data: result, index: df.index, name }));
  }
  return new DataFrame(colMap, df.index);
}

/** Extract row `r` from an array of per-column value arrays. */
function extractRow(
  colArrays: ReadonlyArray<readonly Scalar[]>,
  nCols: number,
  r: number,
): Scalar[] {
  const rowVals: Scalar[] = new Array<Scalar>(nCols);
  for (let c = 0; c < nCols; c++) {
    const arr = colArrays[c];
    const v = arr !== undefined ? arr[r] : undefined;
    rowVals[c] = v !== undefined ? v : null;
  }
  return rowVals;
}

/** Apply pct_change row-wise (axis=1) to a DataFrame. */
function pctChangeRowWise(df: DataFrame, periods: number): DataFrame {
  const colNames = df.columns.values;
  const nRows = df.index.size;
  const nCols = colNames.length;

  const colArrays = colNames.map((c) => df.col(c).values);
  const outCols: Scalar[][] = colNames.map(() => new Array<Scalar>(nRows));

  for (let r = 0; r < nRows; r++) {
    const rowVals = extractRow(colArrays, nCols, r);
    const rowResult = pctChangeVals(rowVals, periods);
    for (let c = 0; c < nCols; c++) {
      const colOut = outCols[c];
      const rv = rowResult[c];
      if (colOut !== undefined) {
        colOut[r] = rv !== undefined ? rv : null;
      }
    }
  }

  const colMap = new Map<string, Series<Scalar>>();
  for (let c = 0; c < nCols; c++) {
    const name = colNames[c];
    const data = outCols[c];
    if (name !== undefined && data !== undefined) {
      colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
    }
  }
  return new DataFrame(colMap, df.index);
}

/**
 * **Percentage change** for every column (or every row) of a DataFrame.
 *
 * Mirrors `pandas.DataFrame.pct_change(periods, axis)`.
 *
 * @param df      Input DataFrame.
 * @param periods Lag (default `1`).
 * @param options `{ axis }` — `0`/`"index"` (default) computes down each column;
 *                `1`/`"columns"` computes across each row.
 * @returns       A new DataFrame of the same shape with `float64` values.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFramePctChange } from "tsb";
 * const df = DataFrame.fromColumns({ a: [100, 110, 121], b: [200, 220, 242] });
 * dataFramePctChange(df).col("a").values; // [NaN, 0.1, 0.1]
 * dataFramePctChange(df, 1, { axis: 1 }).col("b").values; // [1, 1, 1]
 * ```
 */
export function dataFramePctChange(
  df: DataFrame,
  periods = 1,
  options: PctChangeOptions = {},
): DataFrame {
  const axisRaw = options.axis ?? 0;
  const axis: 0 | 1 = axisRaw === 0 || axisRaw === "index" ? 0 : 1;
  if (axis === 0) {
    return pctChangeColWise(df, periods);
  }
  return pctChangeRowWise(df, periods);
}
