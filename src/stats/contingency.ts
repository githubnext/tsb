/**
 * Contingency table statistics.
 *
 * - `contingencyTable` — frequency cross-tabulation from two Series
 * - `chi2Contingency`  — chi-squared test of independence
 * - `fisherExact`      — Fisher exact test for 2×2 tables
 *
 * @example
 * ```ts
 * import { contingencyTable, chi2Contingency } from "tsb";
 * const x = new Series({ data: ["a", "b", "a", "b"] });
 * const y = new Series({ data: ["x", "x", "y", "y"] });
 * const tbl = contingencyTable(x, y);
 * const { statistic, pvalue } = chi2Contingency(tbl);
 * ```
 */

import { DataFrame, type Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Result of a chi-squared test of independence. */
export interface Chi2Result {
  /** Chi-squared test statistic. */
  statistic: number;
  /** p-value (probability of observing this statistic under H0 of independence). */
  pvalue: number;
  /** Degrees of freedom: (rows - 1) * (cols - 1). */
  dof: number;
  /** Expected frequencies as a DataFrame (same shape as the observed table). */
  expected: DataFrame;
}

/** Result of Fisher's exact test. */
export interface FisherResult {
  /** Odds ratio. */
  oddsRatio: number;
  /** Two-tailed p-value. */
  pvalue: number;
}

// ─── gamma / incomplete gamma (shared with hypothesis.ts pattern) ─────────────

/** Lanczos approximation for Γ(z). */
function gamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  const zz = z - 1;
  let x = c[0] ?? 0;
  for (let i = 1; i < g + 2; i++) {
    x += (c[i] ?? 0) / (zz + i);
  }
  const t = zz + g + 0.5;
  return Math.sqrt(2 * Math.PI) * t ** (zz + 0.5) * Math.exp(-t) * x;
}

function lowerIncompleteGammaSeries(a: number, x: number): number {
  let term = 1 / a;
  let sum = term;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-12 * Math.abs(sum)) {
      break;
    }
  }
  return Math.exp(-x + a * Math.log(x) - Math.log(gamma(a))) * sum;
}

function upperIncompleteGammaCF(a: number, x: number): number {
  const maxIter = 200;
  let f = 1e-30;
  let c = f;
  let d = 1 - (a - 1) / x;
  if (Math.abs(d) < 1e-30) {
    d = 1e-30;
  }
  d = 1 / d;
  f = d;
  for (let i = 1; i <= maxIter; i++) {
    const an = i * (a - i);
    const bn = x + 2 * i + 1 - a;
    d = bn + an * d;
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }
    c = bn + an / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }
    d = 1 / d;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-12) {
      break;
    }
  }
  return Math.exp(-x + a * Math.log(x) - Math.log(gamma(a))) * f;
}

function upperIncompleteGamma(a: number, x: number): number {
  if (x < 0) {
    return gamma(a);
  }
  if (x < a + 1) {
    return gamma(a) - lowerIncompleteGammaSeries(a, x);
  }
  return upperIncompleteGammaCF(a, x);
}

/** Chi-squared survival function (1 - CDF) for p-value computation. */
function chi2Pvalue(stat: number, dof: number): number {
  if (stat <= 0) {
    return 1;
  }
  return upperIncompleteGamma(dof / 2, stat / 2) / gamma(dof / 2);
}

// ─── log factorial (for hypergeometric) ───────────────────────────────────────

/** Natural log of n! using Stirling for large n. */
function logFactorial(n: number): number {
  if (n <= 1) {
    return 0;
  }
  let sum = 0;
  for (let k = 2; k <= n; k++) {
    sum += Math.log(k);
  }
  return sum;
}

/** Log-probability of hypergeometric(k; n, K, N). */
function hypergeomLogProb(k: number, n: number, K: number, N: number): number {
  return (
    logFactorial(K) -
    logFactorial(k) -
    logFactorial(K - k) +
    logFactorial(N - K) -
    logFactorial(n - k) -
    logFactorial(N - K - n + k) -
    logFactorial(N) +
    logFactorial(n) +
    logFactorial(N - n)
  );
}

// ─── contingencyTable ─────────────────────────────────────────────────────────

/** Collect unique string labels from a values array in order of first appearance. */
function collectLabels(vals: readonly Scalar[]): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const v of vals) {
    const s = String(v ?? "null");
    if (!seen.has(s)) {
      seen.add(s);
      labels.push(s);
    }
  }
  return labels;
}

/** Build count matrix from paired value arrays. */
function buildCounts(
  xVals: readonly Scalar[],
  yVals: readonly Scalar[],
  rowLabels: string[],
): Map<string, Map<string, number>> {
  const counts = new Map<string, Map<string, number>>();
  for (const rl of rowLabels) {
    counts.set(rl, new Map<string, number>());
  }
  for (let i = 0; i < xVals.length; i++) {
    const r = String(xVals[i] ?? "null");
    const c = String(yVals[i] ?? "null");
    const row = counts.get(r);
    if (row !== undefined) {
      row.set(c, (row.get(c) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Build a contingency table (frequency cross-tabulation) from two categorical Series.
 *
 * @param x - First categorical Series (rows).
 * @param y - Second categorical Series (columns).
 * @returns A DataFrame where entry [i, j] is the count of rows where x=i and y=j.
 *
 * @example
 * ```ts
 * const x = new Series({ data: ["a", "b", "a"] });
 * const y = new Series({ data: ["x", "x", "y"] });
 * contingencyTable(x, y);
 * ```
 */
export function contingencyTable(x: Series<Scalar>, y: Series<Scalar>): DataFrame {
  if (x.values.length !== y.values.length) {
    throw new Error("contingencyTable: x and y must have the same length");
  }

  const rowLabels = collectLabels(x.values);
  const colLabels = collectLabels(y.values);
  const counts = buildCounts(x.values, y.values, rowLabels);

  const colData: Record<string, Scalar[]> = {};
  for (const cl of colLabels) {
    const arr: Scalar[] = [];
    for (const rl of rowLabels) {
      arr.push(counts.get(rl)?.get(cl) ?? 0);
    }
    colData[cl] = arr;
  }

  return DataFrame.fromColumns(colData, { index: rowLabels });
}

// ─── buildExpected ────────────────────────────────────────────────────────────

/** Compute expected frequencies matrix for a contingency table. */
function buildExpected(table: DataFrame): number[][] {
  const nRows = table.index.size;
  const colNames = [...table.columns.values];
  const nCols = colNames.length;

  const observed: number[][] = [];
  for (let r = 0; r < nRows; r++) {
    const rowArr: number[] = [];
    for (const colName of colNames) {
      const v = table.col(colName).values[r] ?? 0;
      rowArr.push(typeof v === "number" ? v : 0);
    }
    observed.push(rowArr);
  }

  const rowTotals: number[] = observed.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals: number[] = Array.from({ length: nCols }, (_, ci) =>
    observed.reduce((s, row) => s + (row[ci] ?? 0), 0),
  );
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  if (grandTotal === 0) {
    return observed.map((row) => row.map(() => 0));
  }

  return observed.map((_, ri) => colTotals.map((ct) => ((rowTotals[ri] ?? 0) * ct) / grandTotal));
}

/** Compute chi-squared statistic from observed and expected matrices. */
function computeChi2Stat(observed: number[][], expected: number[][], correction: boolean): number {
  let stat = 0;
  for (let r = 0; r < observed.length; r++) {
    const obsRow = observed[r] ?? [];
    const expRow = expected[r] ?? [];
    for (let c = 0; c < obsRow.length; c++) {
      const o = obsRow[c] ?? 0;
      const e = expRow[c] ?? 0;
      if (e === 0) {
        continue;
      }
      const diff = correction ? Math.max(0, Math.abs(o - e) - 0.5) : Math.abs(o - e);
      stat += (diff * diff) / e;
    }
  }
  return stat;
}

// ─── chi2Contingency ─────────────────────────────────────────────────────────

/**
 * Chi-squared test of independence for a contingency table.
 *
 * @param table      - A DataFrame of non-negative integer counts.
 * @param options    - `correction`: apply Yates' continuity correction. Default: true for 2×2.
 *
 * @example
 * ```ts
 * const tbl = contingencyTable(x, y);
 * const { statistic, pvalue, dof } = chi2Contingency(tbl);
 * ```
 */
export function chi2Contingency(table: DataFrame, options?: { correction?: boolean }): Chi2Result {
  const nRows = table.index.size;
  const colNames = [...table.columns.values];
  const nCols = colNames.length;

  if (nRows === 0 || nCols === 0) {
    throw new Error("chi2Contingency: table must not be empty");
  }

  const dof = (nRows - 1) * (nCols - 1);
  // Yates correction defaults to true only for 2x2
  const correction = options?.correction ?? (nRows === 2 && nCols === 2);

  const observed: number[][] = [];
  for (let r = 0; r < nRows; r++) {
    const rowArr: number[] = [];
    for (const colName of colNames) {
      const v = table.col(colName).values[r] ?? 0;
      rowArr.push(typeof v === "number" ? v : 0);
    }
    observed.push(rowArr);
  }

  const expectedMatrix = buildExpected(table);
  const stat = computeChi2Stat(observed, expectedMatrix, correction);
  const pvalue = dof === 0 ? 1 : chi2Pvalue(stat, dof);

  // Build expected DataFrame
  const expColData: Record<string, Scalar[]> = {};
  for (let ci = 0; ci < nCols; ci++) {
    const colName = colNames[ci] ?? `col${ci}`;
    expColData[colName] = expectedMatrix.map((row) => row[ci] ?? 0);
  }
  const expectedDf = DataFrame.fromColumns(expColData, {
    index: [...table.index.values] as string[],
  });

  return { statistic: stat, pvalue, dof, expected: expectedDf };
}

// ─── fisherExact ──────────────────────────────────────────────────────────────

/**
 * Fisher's exact test for a 2×2 contingency table.
 *
 * @param table - A 2×2 DataFrame of non-negative integer counts.
 *
 * @example
 * ```ts
 * const tbl = DataFrame.fromColumns({ yes: [8, 2], no: [2, 8] });
 * const { oddsRatio, pvalue } = fisherExact(tbl);
 * ```
 */
export function fisherExact(table: DataFrame): FisherResult {
  if (table.index.size !== 2 || table.columns.values.length !== 2) {
    throw new Error("fisherExact: table must be 2×2");
  }

  const col0 = table.columns.values[0] ?? "";
  const col1 = table.columns.values[1] ?? "";
  const col0s = table.col(col0);
  const col1s = table.col(col1);

  const a = Number(col0s.values[0] ?? 0);
  const c = Number(col0s.values[1] ?? 0);
  const b = Number(col1s.values[0] ?? 0);
  const d = Number(col1s.values[1] ?? 0);

  if (a < 0 || b < 0 || c < 0 || d < 0) {
    throw new Error("fisherExact: all counts must be non-negative");
  }

  const oddsRatio = b * c === 0 ? Number.POSITIVE_INFINITY : (a * d) / (b * c);

  const n = a + b + c + d;
  const K = a + c; // column 0 total
  const rowN = a + b; // row 0 total

  // Compute all hypergeometric probabilities for k in [max(0, rowN+K-n), min(rowN, K)]
  const kMin = Math.max(0, rowN + K - n);
  const kMax = Math.min(rowN, K);

  const logPObs = hypergeomLogProb(a, rowN, K, n);
  let pvalue = 0;

  for (let k = kMin; k <= kMax; k++) {
    const logP = hypergeomLogProb(k, rowN, K, n);
    if (logP <= logPObs + 1e-10) {
      pvalue += Math.exp(logP);
    }
  }

  return { oddsRatio, pvalue: Math.min(1, pvalue) };
}
