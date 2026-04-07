/**
 * unique / nunique — unique values and unique-value counts.
 *
 * Mirrors:
 * - `pandas.unique(values)` / `Series.unique()` — unique values in order of
 *   first appearance (hash-table based, does NOT sort).
 * - `Series.nunique(dropna=True)` — count of distinct non-missing values.
 * - `DataFrame.nunique(axis=0, dropna=True)` — per-column (or per-row) count
 *   of distinct non-missing values.
 *
 * @module
 *
 * @example
 * ```ts
 * import { unique, nunique, dataFrameNunique } from "tsb";
 * import { Series, DataFrame } from "tsb";
 *
 * const s = new Series([3, 1, 2, 1, 3, null]);
 * unique(s);           // Series([3, 1, 2, null])
 * nunique(s);          // 3  (null excluded by default)
 * nunique(s, { dropna: false }); // 4
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 2], b: [3, 3, 4] });
 * dataFrameNunique(df); // Series({ a: 2, b: 2 })
 * ```
 */

import type { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is missing — null, undefined, or NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Build a stable key for a scalar value so it can be stored in a `Set`.
 *
 * All missing sentinels (null, undefined, NaN) are mapped to the same key so
 * that they de-duplicate against each other — consistent with the documented
 * behaviour that all three are treated as a single "missing" category.
 */
function scalarKey(v: Scalar): unknown {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return "__MISSING__"; // stable key for all missing sentinels
  }
  return v;
}

/**
 * Collect unique values in first-seen order from `values`, with optional
 * missing-value exclusion.
 *
 * @param values  - Input data array.
 * @param dropna  - When `true`, missing values (null / undefined / NaN) are
 *   excluded from the result.
 * @returns Array of unique values in order of first appearance.
 */
function collectUnique(values: readonly Scalar[], dropna: boolean): Scalar[] {
  const seen = new Set<unknown>();
  const result: Scalar[] = [];

  for (const v of values) {
    if (dropna && isMissing(v)) continue;
    const key = scalarKey(v);
    if (!seen.has(key)) {
      seen.add(key);
      // Normalise undefined → null for the output (matches pandas NaN treatment)
      result.push(v === undefined ? null : v);
    }
  }

  return result;
}

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link nunique} and {@link dataFrameNunique}. */
export interface NuniqOptions {
  /**
   * When `true` (default), missing values (null / undefined / NaN) are
   * excluded before counting.  When `false`, missing values are counted as
   * a distinct category.
   * @defaultValue `true`
   */
  readonly dropna?: boolean;
}

/** Options for {@link unique}. */
export interface UniqueOptions {
  /**
   * When `true`, missing values (null / undefined / NaN) are excluded from
   * the returned unique values.  When `false` (default), missing values are
   * included as a distinct category (matching pandas `Series.unique()` which
   * returns NaN when present).
   * @defaultValue `false`
   */
  readonly dropna?: boolean;
}

/** Options for {@link dataFrameNunique}. */
export interface DataFrameNuniqOptions extends NuniqOptions {
  /**
   * Axis along which to count unique values:
   * - `0` / `"index"` (default): count unique values **per column** (returns
   *   a Series indexed by column names).
   * - `1` / `"columns"`: count unique values **per row** (returns a Series
   *   indexed by row labels).
   * @defaultValue `0`
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── unique ───────────────────────────────────────────────────────────────────

/**
 * Return unique values from a Series in order of first appearance.
 *
 * Mirrors `pandas.unique(values)` / `Series.unique()`.
 *
 * The result is a new `Series` whose values are the unique elements in
 * first-appearance order.  The index is a default `RangeIndex` starting at 0.
 *
 * Missing values (null / undefined / NaN) are treated as a single distinct
 * category and included by default (matching pandas, which returns `NaN` when
 * present).  Use `options.dropna: true` to exclude them.
 *
 * @param series  - Input Series.
 * @param options - Optional settings (see {@link UniqueOptions}).
 * @returns A new Series of unique values in first-appearance order.
 *
 * @example
 * ```ts
 * const s = new Series([3, 1, 2, 1, 3, null], { name: "x" });
 * unique(s).values; // [3, 1, 2, null]
 * ```
 */
export function unique(series: Series<Scalar>, options: UniqueOptions = {}): Series<Scalar> {
  const dropna = options.dropna ?? false;
  const vals = collectUnique(series.values, dropna);
  return new Series<Scalar>({ data: vals, name: series.name ?? null });
}

// ─── nunique ──────────────────────────────────────────────────────────────────

/**
 * Return the number of distinct values in a Series.
 *
 * Mirrors `pandas.Series.nunique(dropna=True)`.
 *
 * By default, missing values (null / undefined / NaN) are excluded before
 * counting.  Pass `{ dropna: false }` to include them as a distinct category.
 *
 * @param series  - Input Series.
 * @param options - Optional settings (see {@link NuniqOptions}).
 * @returns Count of distinct (non-missing when `dropna=true`) values.
 *
 * @example
 * ```ts
 * const s = new Series([1, 2, 2, null, NaN]);
 * nunique(s);                    // 2  (null and NaN excluded)
 * nunique(s, { dropna: false }); // 3  (null and NaN counted as one distinct missing)
 * ```
 */
export function nunique(series: Series<Scalar>, options: NuniqOptions = {}): number {
  const dropna = options.dropna ?? true;
  return collectUnique(series.values, dropna).length;
}

// ─── dataFrameNunique ─────────────────────────────────────────────────────────

/**
 * Count distinct values along the specified axis of a DataFrame.
 *
 * Mirrors `pandas.DataFrame.nunique(axis=0, dropna=True)`.
 *
 * - `axis=0` (default): return a Series indexed by **column names** where each
 *   value is the number of unique (non-missing) values in that column.
 * - `axis=1`: return a Series indexed by **row labels** where each value is the
 *   number of unique (non-missing) values in that row.
 *
 * @param df      - Input DataFrame.
 * @param options - Optional settings (see {@link DataFrameNuniqOptions}).
 * @returns A `Series<number>` of unique-value counts.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 2], b: [3, 3, 4] });
 * dataFrameNunique(df).values; // [2, 2]  (per-column)
 * dataFrameNunique(df, { axis: 1 }).values; // [2, 2, 2]  (per-row)
 * ```
 */
export function dataFrameNunique(
  df: DataFrame,
  options: DataFrameNuniqOptions = {},
): Series<number> {
  const dropna = options.dropna ?? true;
  const rawAxis = options.axis ?? 0;
  let axis: 0 | 1;
  if (rawAxis === "columns") {
    axis = 1;
  } else if (rawAxis === "index") {
    axis = 0;
  } else {
    axis = rawAxis;
  }

  if (axis === 0) {
    // Per-column: iterate over each column
    const counts: number[] = [];
    const labels: Label[] = [];

    for (const colName of df.columns.values) {
      labels.push(colName);
      counts.push(collectUnique(df.col(colName).values, dropna).length);
    }

    return new Series<number>({ data: counts, index: new Index<Label>(labels), name: null });
  }

  // Per-row: iterate over each row
  const nRows = df.index.size;
  const counts: number[] = [];
  const colNames = df.columns.values;

  // Pre-fetch column arrays for efficiency
  const colArrays: ReadonlyArray<readonly Scalar[]> = colNames.map((c) => df.col(c).values);

  for (let ri = 0; ri < nRows; ri++) {
    const rowVals: Scalar[] = colArrays.map((arr) => arr[ri] ?? null);
    counts.push(collectUnique(rowVals, dropna).length);
  }

  return new Series<number>({
    data: counts,
    index: df.index as unknown as Index<Label>,
    name: null,
  });
}
