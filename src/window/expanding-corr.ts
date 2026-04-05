/**
 * Expanding-window pairwise correlation and covariance between Series and DataFrame columns.
 *
 * Mirrors:
 * - `pandas.core.window.expanding.Expanding.corr`
 * - `pandas.core.window.expanding.Expanding.cov`
 *
 * At each position `i`, the statistic is computed over all observations `[0, i]`
 * where both inputs have non-null, non-NaN values.
 *
 * @example
 * ```ts
 * import { Series, expandingCorr, expandingCov } from "tsb";
 *
 * const x = new Series({ data: [1, 2, 3, 4, 5] });
 * const y = new Series({ data: [2, 4, 6, 8, 10] });
 * expandingCorr(x, y).values;  // [null, 1.0, 1.0, 1.0, 1.0]
 * expandingCov(x, y).values;   // [null, 2.0, 2.5, 3.333..., 5.0]
 * ```
 */

import type { Index } from "../core/index.ts";
import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Collect aligned numeric pairs from positions 0..i (inclusive). */
function collectPairs(a: readonly Scalar[], b: readonly Scalar[], i: number): [number[], number[]] {
  const na: number[] = [];
  const nb: number[] = [];
  const end = Math.min(i, a.length - 1, b.length - 1);
  for (let j = 0; j <= end; j++) {
    const av = a[j] ?? null;
    const bv = b[j] ?? null;
    if (typeof av === "number" && !isMissing(av) && typeof bv === "number" && !isMissing(bv)) {
      na.push(av);
      nb.push(bv);
    }
  }
  return [na, nb];
}

/** Arithmetic mean of a non-empty numeric array. */
function meanOf(vals: number[]): number {
  let s = 0;
  for (const v of vals) {
    s += v;
  }
  return s / vals.length;
}

/** Pearson correlation between two equal-length arrays (returns null if n < 2). */
function pearsonCorr(a: number[], b: number[]): number | null {
  if (a.length < 2) {
    return null;
  }
  const ma = meanOf(a);
  const mb = meanOf(b);
  let num = 0;
  let da2 = 0;
  let db2 = 0;
  for (let i = 0; i < a.length; i++) {
    const da = (a[i] ?? 0) - ma;
    const db = (b[i] ?? 0) - mb;
    num += da * db;
    da2 += da * da;
    db2 += db * db;
  }
  const denom = Math.sqrt(da2 * db2);
  return denom === 0 ? Number.NaN : num / denom;
}

/** Sample covariance (ddof) between two equal-length arrays (null if insufficient obs). */
function sampleCov(a: number[], b: number[], ddof: number): number | null {
  if (a.length <= ddof) {
    return null;
  }
  const ma = meanOf(a);
  const mb = meanOf(b);
  let num = 0;
  for (let i = 0; i < a.length; i++) {
    num += ((a[i] ?? 0) - ma) * ((b[i] ?? 0) - mb);
  }
  return num / (a.length - ddof);
}

/** Build a result Series with the same index and name as `source`. */
function buildResult(source: Series<Scalar>, values: (number | null)[]): Series<number | null> {
  return new Series<number | null>({
    data: values,
    index: source.index,
    name: source.name,
  });
}

// ─── Series: expandingCorr ────────────────────────────────────────────────────

/**
 * Expanding Pearson correlation between two Series.
 *
 * At position `i`, computes the correlation over all aligned pairs in `[0, i]`.
 * Returns `null` when fewer than `max(minPeriods, 2)` valid pairs are available.
 *
 * @param s1 - First Series.
 * @param s2 - Second Series (aligned by position, not by index label).
 * @param minPeriods - Minimum number of valid observations. Default 1 (but at least 2 needed).
 *
 * @example
 * ```ts
 * const x = new Series({ data: [1, 2, 4, 7] });
 * const y = new Series({ data: [2, 4, 8, 14] });
 * expandingCorr(x, y).values;  // [null, 1.0, 1.0, 0.997...]
 * ```
 */
export function expandingCorr(
  s1: Series<Scalar>,
  s2: Series<Scalar>,
  minPeriods = 1,
): Series<number | null> {
  const a = s1.values;
  const b = s2.values;
  const n = Math.min(a.length, b.length);
  const out: (number | null)[] = [];
  const threshold = Math.max(minPeriods, 2);
  for (let i = 0; i < n; i++) {
    const [pa, pb] = collectPairs(a, b, i);
    out.push(pa.length < threshold ? null : pearsonCorr(pa, pb));
  }
  return buildResult(s1, out);
}

// ─── Series: expandingCov ─────────────────────────────────────────────────────

/** Options for expanding covariance. */
export interface ExpandingCovOptions {
  /** Minimum number of valid observations required to compute a value. Default 1. */
  minPeriods?: number;
  /** Delta degrees of freedom for variance (0 = population, 1 = sample). Default 1. */
  ddof?: number;
}

/**
 * Expanding sample covariance between two Series.
 *
 * At position `i`, computes the covariance over all aligned pairs in `[0, i]`.
 * Returns `null` when the window has fewer than `ddof + 1` valid pairs.
 *
 * @example
 * ```ts
 * const x = new Series({ data: [1, 2, 3] });
 * const y = new Series({ data: [4, 5, 6] });
 * expandingCov(x, y).values;  // [null, 0.5, 1.0]
 * ```
 */
export function expandingCov(
  s1: Series<Scalar>,
  s2: Series<Scalar>,
  options?: ExpandingCovOptions,
): Series<number | null> {
  const minPeriods = options?.minPeriods ?? 1;
  const ddof = options?.ddof ?? 1;
  const a = s1.values;
  const b = s2.values;
  const n = Math.min(a.length, b.length);
  const out: (number | null)[] = [];
  const threshold = Math.max(minPeriods, ddof + 1);
  for (let i = 0; i < n; i++) {
    const [pa, pb] = collectPairs(a, b, i);
    out.push(pa.length < threshold ? null : sampleCov(pa, pb, ddof));
  }
  return buildResult(s1, out);
}

// ─── DataFrame: expandingCorrDF ───────────────────────────────────────────────

/** Return numeric column names from a DataFrame. */
function numericCols(df: DataFrame): string[] {
  return df.columns.values.filter((c: string) => {
    const col = df.col(c);
    return col.values.some((v) => typeof v === "number" && !isMissing(v));
  });
}

/**
 * Expanding pairwise correlation for a DataFrame.
 *
 * - If `other` is omitted, returns a DataFrame with columns `c1_c2` for all
 *   numeric column pairs.
 * - If `other` is provided, correlates each matching numeric column name
 *   between `df` and `other` (positional alignment).
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3,4], b: [4,3,2,1] });
 * const corr = expandingCorrDF(df);
 * // columns: a_a, a_b, b_a, b_b
 * ```
 */
export function expandingCorrDF(df: DataFrame, other?: DataFrame, minPeriods = 1): DataFrame {
  const cols = numericCols(df);
  const colData: Record<string, readonly Scalar[]> = {};
  if (other !== undefined) {
    for (const col of cols) {
      if (other.columns.values.includes(col)) {
        colData[col] = expandingCorr(df.col(col), other.col(col), minPeriods).values;
      }
    }
  } else {
    for (const c1 of cols) {
      for (const c2 of cols) {
        colData[`${c1}_${c2}`] = expandingCorr(df.col(c1), df.col(c2), minPeriods).values;
      }
    }
  }
  return DataFrame.fromColumns(colData, { index: df.index as Index<Label> });
}

/**
 * Expanding pairwise covariance for a DataFrame.
 *
 * - If `other` is omitted, returns a DataFrame with columns `c1_c2` for all
 *   numeric column pairs.
 * - If `other` is provided, covariances each matching numeric column name
 *   between `df` and `other`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3,4], b: [4,3,2,1] });
 * const cov = expandingCovDF(df);
 * ```
 */
export function expandingCovDF(
  df: DataFrame,
  other?: DataFrame,
  options?: ExpandingCovOptions,
): DataFrame {
  const cols = numericCols(df);
  const colData: Record<string, readonly Scalar[]> = {};
  if (other !== undefined) {
    for (const col of cols) {
      if (other.columns.values.includes(col)) {
        colData[col] = expandingCov(df.col(col), other.col(col), options).values;
      }
    }
  } else {
    for (const c1 of cols) {
      for (const c2 of cols) {
        colData[`${c1}_${c2}`] = expandingCov(df.col(c1), df.col(c2), options).values;
      }
    }
  }
  return DataFrame.fromColumns(colData, { index: df.index as Index<Label> });
}
