/**
 * Nonparametric tests for group comparisons.
 *
 * - `kruskalWallis` — Kruskal-Wallis H test (nonparametric one-way ANOVA)
 * - `friedmanTest`  — Friedman test (nonparametric repeated-measures ANOVA)
 *
 * Both return a test statistic, p-value, and degrees of freedom.
 *
 * @example
 * ```ts
 * import { kruskalWallis } from "tsb";
 * const result = kruskalWallis([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
 * console.log(result.statistic, result.pValue); // large H, small p
 * ```
 *
 * @module
 */

// ─── result type ──────────────────────────────────────────────────────────────

/** Result of a Kruskal-Wallis or Friedman test. */
export interface KruskalResult {
  /** Test statistic (H for Kruskal-Wallis, χ² for Friedman). */
  statistic: number;
  /** Two-sided p-value derived from chi-squared distribution. */
  pValue: number;
  /** Degrees of freedom (number of groups minus 1). */
  df: number;
}

// ─── math helpers ─────────────────────────────────────────────────────────────

/** Log-gamma via Lanczos approximation. */
function lnGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  const zz = z - 1;
  let x = c[0] ?? 0;
  for (let i = 1; i < g + 2; i++) {
    x += (c[i] ?? 0) / (zz + i);
  }
  const t = zz + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Lentz continued-fraction for regularized incomplete gamma. */
function gammaCF(a: number, x: number): number {
  const maxIter = 200;
  let f = 1e-30;
  let c = f;
  let d = 1 - (x + 1 - a);
  if (Math.abs(d) < 1e-30) {
    d = 1e-30;
  }
  d = 1 / d;
  f = d;
  for (let i = 1; i <= maxIter; i++) {
    const an = -i * (i - a);
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
    const del = d * c;
    f *= del;
    if (Math.abs(del - 1) < 1e-10) {
      break;
    }
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * f;
}

/** Regularized incomplete gamma function Q(a, x) = 1 - P(a, x). */
function gammaQ(a: number, x: number): number {
  if (x < 0 || a <= 0) {
    return Number.NaN;
  }
  if (x === 0) {
    return 1;
  }
  return gammaCF(a, x);
}

/**
 * Survival function of the chi-squared distribution: P(X > x) for X ~ χ²(df).
 * Used to compute p-values from chi-squared test statistics.
 */
function chi2Sf(x: number, df: number): number {
  if (x <= 0) {
    return 1;
  }
  return gammaQ(df / 2, x / 2);
}

// ─── ranking helpers ──────────────────────────────────────────────────────────

interface RankEntry {
  value: number;
  rank: number;
}

/** Compute average ranks for a pooled array of values (ties get averaged rank). */
function averageRanks(values: readonly number[]): RankEntry[] {
  const n = values.length;
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && (indexed[j]?.v ?? 0) === (indexed[i]?.v ?? 0)) {
      j++;
    }
    const avgRank = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k++) {
      ranks[indexed[k]?.i ?? 0] = avgRank;
    }
    i = j;
  }
  return values.map((v, idx) => ({ value: v, rank: ranks[idx] ?? 0 }));
}

/** Compute tie-correction factor C for Kruskal-Wallis. */
function tieFactor(allValues: readonly number[]): number {
  const n = allValues.length;
  if (n < 2) {
    return 1;
  }
  // Count group sizes for each tied value
  const counts = new Map<number, number>();
  for (const v of allValues) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let sumT = 0;
  for (const t of counts.values()) {
    if (t > 1) {
      sumT += t ** 3 - t;
    }
  }
  const N = n;
  return 1 - sumT / (N ** 3 - N);
}

// ─── Kruskal-Wallis H test ───────────────────────────────────────────────────

/**
 * Kruskal-Wallis H test: nonparametric analogue of one-way ANOVA.
 *
 * Tests whether multiple groups come from the same distribution, without
 * assuming normality. Under H₀ (all groups identical), H is approximately
 * chi-squared with `k - 1` degrees of freedom.
 *
 * @param groups - Array of groups; each group is an array of numbers.
 * @returns Object with H statistic, p-value, and degrees of freedom.
 *
 * @example
 * ```ts
 * const result = kruskalWallis([[1, 2, 3], [4, 5, 6], [10, 11, 12]]);
 * console.log(result.statistic); // ≈ 7.2
 * console.log(result.pValue);    // < 0.05
 * ```
 */
export function kruskalWallis(groups: readonly (readonly number[])[]): KruskalResult {
  const k = groups.length;
  if (k < 2) {
    throw new Error("kruskalWallis requires at least 2 groups");
  }
  for (const g of groups) {
    if (g.length === 0) {
      throw new Error("kruskalWallis: each group must have at least one observation");
    }
  }

  const all = ([] as number[]).concat(...(groups as number[][]));
  const N = all.length;
  const ranked = averageRanks(all);

  // Split back into groups and compute rank sums
  let offset = 0;
  let H = 0;
  for (const g of groups) {
    const ni = g.length;
    let ri = 0;
    for (let j = 0; j < ni; j++) {
      ri += ranked[offset + j]?.rank ?? 0;
    }
    H += ri ** 2 / ni;
    offset += ni;
  }
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);

  // Apply tie correction
  const C = tieFactor(all);
  if (C > 0) {
    H /= C;
  }

  const df = k - 1;
  const pValue = chi2Sf(H, df);
  return { statistic: H, pValue, df };
}

// ─── Friedman test ────────────────────────────────────────────────────────────

/**
 * Friedman test: nonparametric analogue of repeated-measures ANOVA.
 *
 * Ranks each row (block) independently, then tests whether column (treatment)
 * rank sums differ significantly. Under H₀, the statistic is approximately
 * chi-squared with `k - 1` degrees of freedom.
 *
 * @param data - Matrix of shape `[n, k]` where rows are blocks and columns
 *   are treatments/conditions.
 * @returns Object with chi-squared statistic, p-value, and degrees of freedom.
 *
 * @example
 * ```ts
 * const result = friedmanTest([
 *   [9, 8, 7],
 *   [7, 6, 5],
 *   [5, 4, 3],
 * ]);
 * console.log(result.statistic); // ≈ 6.0
 * console.log(result.pValue);    // < 0.05
 * ```
 */
export function friedmanTest(data: readonly (readonly number[])[]): KruskalResult {
  const n = data.length;
  if (n < 2) {
    throw new Error("friedmanTest requires at least 2 blocks (rows)");
  }
  const k = data[0]?.length ?? 0;
  if (k < 2) {
    throw new Error("friedmanTest requires at least 2 treatments (columns)");
  }
  for (const row of data) {
    if (row.length !== k) {
      throw new Error("friedmanTest: all rows must have the same number of columns");
    }
  }

  // Rank within each row
  const rankSums = new Array<number>(k).fill(0);
  for (const row of data) {
    const rowRanked = averageRanks(row);
    for (let j = 0; j < k; j++) {
      rankSums[j] = (rankSums[j] ?? 0) + (rowRanked[j]?.rank ?? 0);
    }
  }

  // Friedman statistic (large-sample approximation)
  const rMean = (k + 1) / 2;
  let ssR = 0;
  for (let j = 0; j < k; j++) {
    const rj = (rankSums[j] ?? 0) / n;
    ssR += (rj - rMean) ** 2;
  }
  const chi2 = ((12 * n) / (k * (k + 1))) * ssR;

  const df = k - 1;
  const pValue = chi2Sf(chi2, df);
  return { statistic: chi2, pValue, df };
}
