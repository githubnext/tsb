/**
 * Nonparametric rank-based two-sample tests.
 *
 * - `mannWhitneyU`    — Mann-Whitney U test (Wilcoxon rank-sum test)
 * - `wilcoxonSigned`  — Wilcoxon signed-rank test for paired samples
 *
 * Both return a test statistic, p-value, and (for signed) degrees of freedom.
 *
 * @example
 * ```ts
 * import { mannWhitneyU } from "tsb";
 * const result = mannWhitneyU([1, 2, 3], [4, 5, 6]);
 * console.log(result.statistic, result.pValue); // U=0, p<0.05
 * ```
 *
 * @module
 */

// ─── result types ──────────────────────────────────────────────────────────────

/** Result of a Mann-Whitney U test. */
export interface MannWhitneyResult {
  /** The smaller of U₁ and U₂. */
  statistic: number;
  /** Two-sided p-value (normal approximation with continuity correction). */
  pValue: number;
  /** U₁ — count of (a, b) pairs where a > b. */
  u1: number;
  /** U₂ — count of (a, b) pairs where b > a. */
  u2: number;
}

/** Result of a Wilcoxon signed-rank test. */
export interface WilcoxonResult {
  /** Smaller of positive and negative rank sums. */
  statistic: number;
  /** Two-sided p-value (normal approximation with continuity correction). */
  pValue: number;
  /** Sum of positive ranks. */
  wPlus: number;
  /** Sum of negative ranks (absolute value). */
  wMinus: number;
}

// ─── math helpers ─────────────────────────────────────────────────────────────

/** Error function approximation (Horner's method). */
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const sign = x < 0 ? -1 : 1;
  return sign * (1 - poly * Math.exp(-x * x));
}

/** Standard normal CDF. */
function normalCdf(z: number): number {
  return (1 + erf(z / Math.SQRT2)) / 2;
}

/** Two-tailed p-value from a standard normal z-score. */
function zToP(z: number): number {
  return 2 * normalCdf(-Math.abs(z));
}

/** Compute average ranks for a pooled array (ties get averaged rank). */
function averageRanks(values: readonly number[]): number[] {
  const n = values.length;
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && (indexed[j]?.v ?? 0) === (indexed[i]?.v ?? 0)) {
      j++;
    }
    const avg = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k++) {
      ranks[indexed[k]?.i ?? 0] = avg;
    }
    i = j;
  }
  return ranks;
}

/** Tie correction term T = sum of (t³ − t) for each run of ties. */
function tieCorrection(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let T = 0;
  for (const t of counts.values()) {
    if (t > 1) {
      T += t ** 3 - t;
    }
  }
  return T;
}

// ─── Mann-Whitney U test ──────────────────────────────────────────────────────

/**
 * Mann-Whitney U test (Wilcoxon rank-sum test).
 *
 * Tests whether two independent samples come from the same distribution.
 * Uses the normal approximation with continuity correction and tie adjustment.
 *
 * @param a - First sample.
 * @param b - Second sample.
 * @returns U statistic (smaller of U₁, U₂), p-value, and both U values.
 *
 * @example
 * ```ts
 * const result = mannWhitneyU([1, 2, 3], [4, 5, 6]);
 * console.log(result.u1); // 0  (no a > b pairs)
 * console.log(result.u2); // 9  (all b > a pairs)
 * ```
 */
export function mannWhitneyU(a: readonly number[], b: readonly number[]): MannWhitneyResult {
  const n1 = a.length;
  const n2 = b.length;
  if (n1 === 0 || n2 === 0) {
    throw new Error("mannWhitneyU: both samples must be non-empty");
  }

  const pooled = [...a, ...b];
  const N = pooled.length;
  const ranks = averageRanks(pooled);

  let r1 = 0;
  for (let i = 0; i < n1; i++) {
    r1 += ranks[i] ?? 0;
  }

  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const U = Math.min(u1, u2);

  // Normal approximation
  const muU = (n1 * n2) / 2;
  const T = tieCorrection(pooled);
  const sigmaU = Math.sqrt(((n1 * n2) / (N * (N - 1))) * ((N ** 3 - N) / 12 - T / 12));

  let z = 0;
  if (sigmaU > 0) {
    // Continuity correction
    z = (U - muU + 0.5) / sigmaU;
    // For the smaller U, correction moves toward mean
    if (U === u1 && u1 < muU) {
      z = (U - muU + 0.5) / sigmaU;
    } else {
      z = (U - muU - 0.5) / sigmaU;
    }
  }

  const pValue = zToP(z);
  return { statistic: U, pValue, u1, u2 };
}

// ─── Wilcoxon signed-rank test ─────────────────────────────────────────────────

/**
 * Wilcoxon signed-rank test for paired samples.
 *
 * Tests whether two paired samples have the same distribution, without
 * assuming normality. Differences of zero are excluded. Uses the normal
 * approximation with continuity correction.
 *
 * @param x - First sample (paired with `y`).
 * @param y - Second sample (same length as `x`).
 * @returns W statistic (smaller of W⁺, W⁻), p-value, and both rank sums.
 *
 * @example
 * ```ts
 * const result = wilcoxonSigned([1, 2, 3, 4, 5], [2, 3, 4, 5, 6]);
 * // All differences are −1; W+ = 0, W− = 15
 * console.log(result.statistic); // 0
 * console.log(result.pValue);    // < 0.05
 * ```
 */
/** Compute non-zero differences of paired arrays x - y. */
function nonZeroDiffs(x: readonly number[], y: readonly number[]): number[] {
  const diffs: number[] = [];
  for (let i = 0; i < x.length; i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) {
      diffs.push(d);
    }
  }
  return diffs;
}

/** Compute positive and negative rank sums from diffs and their ranks. */
function rankSumsForDiffs(
  diffs: readonly number[],
  ranks: readonly number[],
): { wPlus: number; wMinus: number } {
  let wPlus = 0;
  let wMinus = 0;
  for (let i = 0; i < diffs.length; i++) {
    if ((diffs[i] ?? 0) > 0) {
      wPlus += ranks[i] ?? 0;
    } else {
      wMinus += ranks[i] ?? 0;
    }
  }
  return { wPlus, wMinus };
}

export function wilcoxonSigned(x: readonly number[], y: readonly number[]): WilcoxonResult {
  if (x.length !== y.length) {
    throw new Error("wilcoxonSigned: x and y must have the same length");
  }
  if (x.length === 0) {
    throw new Error("wilcoxonSigned: samples must be non-empty");
  }

  const diffs = nonZeroDiffs(x, y);
  const n = diffs.length;
  if (n === 0) {
    return { statistic: 0, pValue: 1, wPlus: 0, wMinus: 0 };
  }

  const absDiffs = diffs.map(Math.abs);
  const ranks = averageRanks(absDiffs);
  const { wPlus, wMinus } = rankSumsForDiffs(diffs, ranks);

  const W = Math.min(wPlus, wMinus);

  // Normal approximation with tie correction
  const T = tieCorrection(absDiffs);
  const sigmaW = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - T / 48);
  const muW = (n * (n + 1)) / 4;

  let z = 0;
  if (sigmaW > 0) {
    z = (W - muW + 0.5) / sigmaW;
  }

  const pValue = zToP(z);
  return { statistic: W, pValue, wPlus, wMinus };
}
