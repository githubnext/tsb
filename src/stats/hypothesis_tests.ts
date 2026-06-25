/**
 * hypothesis_tests — scipy-style statistical hypothesis tests.
 *
 * Mirrors `scipy.stats.*` for common hypothesis tests, implemented from
 * scratch with no external dependencies. Accepts both plain `number[]` and
 * `Series` inputs.
 *
 * Implemented tests:
 * - {@link ttest1samp}       — one-sample t-test
 * - {@link ttestInd}         — Welch's independent two-sample t-test
 * - {@link ttestRel}         — paired (related-samples) t-test
 * - {@link chi2Contingency}  — chi-square test for independence
 * - {@link fOneway}          — one-way ANOVA (F-test)
 * - {@link jarqueBera}       — Jarque-Bera normality test
 * - {@link pearsonr}         — Pearson r with p-value
 * - {@link spearmanr}        — Spearman ρ with p-value
 * - {@link mannWhitneyU}     — Mann-Whitney U test
 * - {@link kstest}           — one-sample Kolmogorov-Smirnov test
 *
 * @module
 */

import { Series } from "../core/index.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Result returned by all hypothesis tests. */
export interface HTestResult {
  /** The test statistic (t, χ², F, U, D, …). */
  readonly statistic: number;
  /** p-value for the test (two-tailed unless stated otherwise). */
  readonly pvalue: number;
}

/** Result of {@link pearsonr} — includes the correlation coefficient. */
export interface PearsonrResult extends HTestResult {
  /** Pearson correlation coefficient r ∈ [−1, 1]. */
  readonly correlation: number;
}

/** Result of {@link spearmanr} — includes the rank correlation. */
export interface SpearmanrResult extends HTestResult {
  /** Spearman rank correlation coefficient ρ ∈ [−1, 1]. */
  readonly correlation: number;
}

/** Tail direction for one- and two-tailed tests. */
export type Alternative = "two-sided" | "less" | "greater";

/** Options for {@link ttest1samp}. */
export interface Ttest1sampOptions {
  /**
   * Tail direction.
   * - `"two-sided"` (default) — H₁: μ ≠ popmean
   * - `"greater"` — H₁: μ > popmean
   * - `"less"` — H₁: μ < popmean
   */
  readonly alternative?: Alternative;
}

/** Options for {@link ttestInd}. */
export interface TtestIndOptions {
  /**
   * If `true` (default), assume unequal variances (Welch's t-test).
   * If `false`, assume equal variances (Student's t-test).
   */
  readonly equalVar?: boolean;
  /** Tail direction — same as {@link Ttest1sampOptions.alternative}. */
  readonly alternative?: Alternative;
}

/** Options for {@link mannWhitneyU}. */
export interface MannWhitneyUOptions {
  /** Tail direction. Defaults to `"two-sided"`. */
  readonly alternative?: Alternative;
  /**
   * If `true` (default), apply continuity correction (+/−0.5 before
   * dividing by σ).
   */
  readonly correction?: boolean;
}

/** Options for {@link kstest}. */
export interface KstestOptions {
  /** Tail direction. Defaults to `"two-sided"`. */
  readonly alternative?: Alternative;
}

/** Result of {@link chi2Contingency}. */
export interface Chi2ContingencyResult extends HTestResult {
  /** Degrees of freedom = (rows − 1) × (cols − 1). */
  readonly dof: number;
  /** Expected frequency table (same shape as `observed`). */
  readonly expected: readonly (readonly number[])[];
}

/** A CDF function mapping x → cumulative probability in [0, 1]. */
export type CdfFn = (x: number) => number;

// ─── mathematical primitives ──────────────────────────────────────────────────

/**
 * Approximate erf(x) via Abramowitz & Stegun 7.1.26.
 * Maximum absolute error < 1.5×10⁻⁷.
 */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + 0.3275911 * ax);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1.0 - poly * Math.exp(-(ax * ax)));
}

/** Standard normal CDF: Φ(x) = P(Z ≤ x). */
function normalCDF(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.SQRT2));
}

/** Standard normal survival function: P(Z > x). */
function normalSF(x: number): number {
  return 0.5 * (1.0 - erf(x / Math.SQRT2));
}

// ─── log-gamma (Lanczos, g=7) ─────────────────────────────────────────────────

/** Lanczos approximation coefficients (g=7). */
const LG_C: readonly number[] = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/**
 * Natural log of the Gamma function via Lanczos approximation.
 * Valid for z > 0.
 */
function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1.0 - z);
  }
  const x = z - 1.0;
  let a = LG_C[0] as number;
  for (let i = 1; i <= 8; i++) {
    a += (LG_C[i] as number) / (x + i);
  }
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// ─── regularized incomplete gamma ─────────────────────────────────────────────

const GAMMA_MAX_ITER = 300;
const FPMIN = 1e-300;
const GAMMA_EPS = 1e-14;

/**
 * Lower regularized incomplete gamma: P(a, x) = γ(a, x) / Γ(a).
 *
 * Uses a series expansion for x < a + 1 and Lentz's continued-fraction
 * method for x ≥ a + 1.
 */
function regIncGamma(a: number, x: number): number {
  if (x < 0 || a <= 0) {
    return Number.NaN;
  }
  if (x === 0) {
    return 0;
  }
  const lnGa = logGamma(a);
  if (x < a + 1.0) {
    // Series expansion
    let sum = 1.0 / a;
    let term = 1.0 / a;
    for (let n = 1; n <= GAMMA_MAX_ITER; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * GAMMA_EPS) {
        break;
      }
    }
    return Math.exp(-x + a * Math.log(x) - lnGa) * sum;
  }
  // Continued fraction for Q(a, x) = 1 − P(a, x) via Lentz's method
  let b = x + 1.0 - a;
  let c = 1.0 / FPMIN;
  let d = 1.0 / b;
  let h = d;
  for (let i = 1; i <= GAMMA_MAX_ITER; i++) {
    const an = -i * (i - a);
    b += 2.0;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) {
      d = FPMIN;
    }
    c = b + an / c;
    if (Math.abs(c) < FPMIN) {
      c = FPMIN;
    }
    d = 1.0 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1.0) < GAMMA_EPS) {
      break;
    }
  }
  const qax = Math.exp(-x + a * Math.log(x) - lnGa) * h;
  return 1.0 - qax;
}

// ─── regularized incomplete beta ──────────────────────────────────────────────

const BETA_MAX_ITER = 300;
const BETA_EPS = 1e-14;

/**
 * Regularized incomplete beta function: I_x(a, b) = B(x; a, b) / B(a, b).
 *
 * Uses Lentz's continued-fraction method, with symmetry when x > (a+1)/(a+b+2)
 * to ensure better convergence.
 */
function regIncBeta(x: number, a: number, b: number): number {
  if (x < 0 || x > 1) {
    return Number.NaN;
  }
  if (x === 0) {
    return 0;
  }
  if (x === 1) {
    return 1;
  }
  // Symmetry for better continued-fraction convergence
  if (x > (a + 1.0) / (a + b + 2.0)) {
    return 1.0 - regIncBeta(1.0 - x, b, a);
  }
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1.0 - x) - lbeta) / a;
  // Lentz's CF
  let c = 1.0;
  let d = 1.0 - ((a + b) * x) / (a + 1.0);
  if (Math.abs(d) < FPMIN) {
    d = FPMIN;
  }
  d = 1.0 / d;
  let h = d;
  for (let m = 1; m <= BETA_MAX_ITER; m++) {
    // Even step
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) {
      d = FPMIN;
    }
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) {
      c = FPMIN;
    }
    d = 1.0 / d;
    h *= d * c;
    // Odd step
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) {
      d = FPMIN;
    }
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) {
      c = FPMIN;
    }
    d = 1.0 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1.0) < BETA_EPS) {
      break;
    }
  }
  return front * h;
}

// ─── distribution survival functions ─────────────────────────────────────────

/**
 * t-distribution survival function: P(T > t) for t ≥ 0 with `df` degrees
 * of freedom.  Uses I_x(df/2, 0.5) / 2 where x = df/(df + t²).
 */
function tDistSF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 0.5 * regIncBeta(x, df / 2, 0.5);
}

/**
 * Compute a t-distribution p-value with the specified tail direction.
 */
function tPValue(t: number, df: number, alt: Alternative): number {
  if (df <= 0 || Number.isNaN(t)) {
    return Number.NaN;
  }
  const sfAbs = tDistSF(Math.abs(t), df);
  if (alt === "two-sided") {
    return 2 * sfAbs;
  }
  if (alt === "greater") {
    return t >= 0 ? sfAbs : 1.0 - sfAbs;
  }
  // less
  return t >= 0 ? 1.0 - sfAbs : sfAbs;
}

/**
 * Chi-square survival function: P(χ² > x) with `k` degrees of freedom.
 * P(χ² > x | k) = 1 − P(k/2, x/2).
 */
function chi2SF(x: number, k: number): number {
  if (x <= 0) {
    return 1;
  }
  return 1.0 - regIncGamma(k / 2, x / 2);
}

/**
 * F-distribution survival function: P(F > x) with df1, df2 degrees of
 * freedom.  Uses I_{d2/(d2+d1*x)}(d2/2, d1/2).
 */
function fDistSF(x: number, df1: number, df2: number): number {
  if (x <= 0) {
    return 1;
  }
  const bx = df2 / (df2 + df1 * x);
  return regIncBeta(bx, df2 / 2, df1 / 2);
}

/**
 * Kolmogorov distribution survival function: P(K > lambda).
 * Accurate for lambda > 0.3; uses the series 2 Σ (-1)^{k+1} exp(-2k²λ²).
 */
function kolmogorovSF(lambda: number): number {
  if (lambda <= 0) {
    return 1;
  }
  if (lambda > 3.0) {
    return 0;
  }
  let sum = 0;
  for (let k = 1; k <= 100; k++) {
    const term = Math.exp(-2 * k * k * lambda * lambda);
    const signed = k % 2 === 1 ? term : -term;
    sum += signed;
    if (Math.abs(term) < 1e-15) {
      break;
    }
  }
  return Math.min(1, Math.max(0, 2 * sum));
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Convert a Series or number[] to a plain number[] (drop null/NaN). */
function toNumbers(data: readonly number[] | Series): number[] {
  if (data instanceof Series) {
    const out: number[] = [];
    for (const v of data.values) {
      if (typeof v === "number" && !Number.isNaN(v)) {
        out.push(v);
      }
    }
    return out;
  }
  return Array.from(data);
}

/** Sample mean of xs. Returns NaN for empty arrays. */
function mean(xs: readonly number[]): number {
  if (xs.length === 0) {
    return Number.NaN;
  }
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  return s / xs.length;
}

/** Sample variance (ddof=1 by default). Returns NaN for n ≤ ddof. */
function sampleVar(xs: readonly number[], ddof = 1): number {
  const n = xs.length;
  if (n <= ddof) {
    return Number.NaN;
  }
  const m = mean(xs);
  let ss = 0;
  for (const x of xs) {
    ss += (x - m) * (x - m);
  }
  return ss / (n - ddof);
}

/**
 * Rank values using average ties (1-indexed).  NaN/Infinity are placed last.
 */
function averageRank(xs: readonly number[]): number[] {
  const n = xs.length;
  const indexed: { v: number; i: number }[] = xs.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => {
    if (!(Number.isFinite(a.v) || Number.isFinite(b.v))) {
      return 0;
    }
    if (!Number.isFinite(a.v)) {
      return 1;
    }
    if (!Number.isFinite(b.v)) {
      return -1;
    }
    return a.v - b.v;
  });
  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && (indexed[j] as { v: number }).v === (indexed[j + 1] as { v: number }).v) {
      j++;
    }
    const rank = (i + j) / 2 + 1; // average rank, 1-indexed
    for (let k = i; k <= j; k++) {
      ranks[(indexed[k] as { v: number; i: number }).i] = rank;
    }
    i = j + 1;
  }
  return ranks;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * One-sample t-test.
 *
 * Tests the null hypothesis that the population mean equals `popmean`.
 * Mirrors `scipy.stats.ttest_1samp(a, popmean)`.
 *
 * @param data  Sample observations (finite numbers; NaN are dropped).
 * @param popmean  Hypothesised population mean.
 * @param options  Tail direction options.
 * @returns `{ statistic, pvalue }` where statistic is the t-value.
 *
 * @example
 * ```ts
 * const { statistic, pvalue } = ttest1samp([2.1, 2.5, 2.3, 2.7, 2.4], 2.0);
 * ```
 */
export function ttest1samp(
  data: readonly number[] | Series,
  popmean: number,
  options: Ttest1sampOptions = {},
): HTestResult {
  const alt = options.alternative ?? "two-sided";
  const xs = toNumbers(data);
  const n = xs.length;
  if (n < 2) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  const m = mean(xs);
  const se = Math.sqrt(sampleVar(xs) / n);
  const statistic = se === 0 ? (m === popmean ? 0 : Number.POSITIVE_INFINITY) : (m - popmean) / se;
  const pvalue = tPValue(statistic, n - 1, alt);
  return { statistic, pvalue };
}

/**
 * Independent two-sample t-test (Welch's by default).
 *
 * Tests H₀: μ₁ = μ₂.  By default uses Welch's approximation (unequal
 * variances); set `equalVar: true` for Student's equal-variance test.
 * Mirrors `scipy.stats.ttest_ind(a, b, equal_var=True/False)`.
 *
 * @example
 * ```ts
 * const { statistic, pvalue } = ttestInd([1, 2, 3, 4], [2, 3, 4, 5, 6]);
 * ```
 */
export function ttestInd(
  a: readonly number[] | Series,
  b: readonly number[] | Series,
  options: TtestIndOptions = {},
): HTestResult {
  const alt = options.alternative ?? "two-sided";
  const equalVar = options.equalVar ?? false;
  const xs = toNumbers(a);
  const ys = toNumbers(b);
  const n1 = xs.length;
  const n2 = ys.length;
  if (n1 < 2 || n2 < 2) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  const m1 = mean(xs);
  const m2 = mean(ys);
  const v1 = sampleVar(xs);
  const v2 = sampleVar(ys);

  let statistic: number;
  let df: number;

  if (equalVar) {
    // Pooled variance
    const sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
    const se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    statistic = se === 0 ? 0 : (m1 - m2) / se;
    df = n1 + n2 - 2;
  } else {
    // Welch's t-test
    const s1n = v1 / n1;
    const s2n = v2 / n2;
    const se = Math.sqrt(s1n + s2n);
    statistic = se === 0 ? 0 : (m1 - m2) / se;
    // Welch-Satterthwaite degrees of freedom
    df = ((s1n + s2n) * (s1n + s2n)) / ((s1n * s1n) / (n1 - 1) + (s2n * s2n) / (n2 - 1));
  }

  const pvalue = tPValue(statistic, df, alt);
  return { statistic, pvalue };
}

/**
 * Paired (related-samples) t-test.
 *
 * Tests H₀: mean difference = 0. The two arrays must have the same length.
 * Mirrors `scipy.stats.ttest_rel(a, b)`.
 *
 * @example
 * ```ts
 * const { statistic, pvalue } = ttestRel([1, 2, 3], [1.1, 2.0, 3.2]);
 * ```
 */
export function ttestRel(
  a: readonly number[] | Series,
  b: readonly number[] | Series,
  options: Ttest1sampOptions = {},
): HTestResult {
  const alt = options.alternative ?? "two-sided";
  const xs = toNumbers(a);
  const ys = toNumbers(b);
  const n = Math.min(xs.length, ys.length);
  if (n < 2) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    diffs.push((xs[i] as number) - (ys[i] as number));
  }
  const m = mean(diffs);
  const se = Math.sqrt(sampleVar(diffs) / n);
  const statistic = se === 0 ? (m === 0 ? 0 : Number.POSITIVE_INFINITY) : m / se;
  const pvalue = tPValue(statistic, n - 1, alt);
  return { statistic, pvalue };
}

/**
 * Chi-square test for independence.
 *
 * Given a contingency table of observed frequencies, computes the χ²
 * statistic, expected frequencies, degrees of freedom, and p-value.
 * Mirrors `scipy.stats.chi2_contingency(observed)`.
 *
 * @param observed  2-D array of non-negative observed frequencies.
 * @returns `{ statistic, pvalue, dof, expected }`
 *
 * @example
 * ```ts
 * const result = chi2Contingency([[10, 10], [15, 15], [5, 10]]);
 * ```
 */
export function chi2Contingency(observed: readonly (readonly number[])[]): Chi2ContingencyResult {
  const rows = observed.length;
  if (rows === 0) {
    return { statistic: Number.NaN, pvalue: Number.NaN, dof: 0, expected: [] };
  }
  const cols = (observed[0] as readonly number[]).length;
  if (cols === 0) {
    return { statistic: Number.NaN, pvalue: Number.NaN, dof: 0, expected: [] };
  }
  const rowTotals = observed.map((row) => row.reduce((s, v) => s + v, 0));
  const colTotals: number[] = Array.from({ length: cols }, (_, c) => {
    let sum = 0;
    for (let r = 0; r < rows; r++) {
      sum += (observed[r] as readonly number[])[c] as number;
    }
    return sum;
  });
  const grand = rowTotals.reduce((s, v) => s + v, 0);
  if (grand === 0) {
    return { statistic: Number.NaN, pvalue: Number.NaN, dof: 0, expected: [] };
  }
  const expected: number[][] = Array.from({ length: rows }, (_, r) =>
    Array.from(
      { length: cols },
      (__, c) => ((rowTotals[r] as number) * (colTotals[c] as number)) / grand,
    ),
  );
  let statistic = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const o = (observed[r] as readonly number[])[c] as number;
      const e = (expected[r] as number[])[c] as number;
      if (e > 0) {
        statistic += ((o - e) * (o - e)) / e;
      }
    }
  }
  const dof = (rows - 1) * (cols - 1);
  const pvalue = dof > 0 ? chi2SF(statistic, dof) : Number.NaN;
  return { statistic, pvalue, dof, expected };
}

/**
 * One-way ANOVA (F-test).
 *
 * Tests the null hypothesis that two or more groups have equal population
 * means, using the F-distribution.
 * Mirrors `scipy.stats.f_oneway(*groups)`.
 *
 * @param groups  Two or more arrays of observations.
 * @returns `{ statistic, pvalue }` where statistic is the F-value.
 *
 * @example
 * ```ts
 * const { statistic, pvalue } = fOneway([1, 2, 3], [4, 5, 6], [3, 4, 5]);
 * ```
 */
export function fOneway(...groups: (readonly number[] | Series)[]): HTestResult {
  const arrays = groups.map(toNumbers);
  const k = arrays.length;
  if (k < 2) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  const means = arrays.map(mean);
  const ns = arrays.map((a) => a.length);
  const N = ns.reduce((s, n) => s + n, 0);
  if (N <= k) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  const grandMean = arrays.flat().reduce((s, v) => s + v, 0) / N;

  // Between-group sum of squares
  let ssBetween = 0;
  for (let i = 0; i < k; i++) {
    const ni = ns[i] as number;
    const mi = means[i] as number;
    ssBetween += ni * (mi - grandMean) * (mi - grandMean);
  }
  // Within-group sum of squares
  let ssWithin = 0;
  for (let i = 0; i < k; i++) {
    const mi = means[i] as number;
    for (const x of arrays[i] as number[]) {
      ssWithin += (x - mi) * (x - mi);
    }
  }
  const dfBetween = k - 1;
  const dfWithin = N - k;
  if (ssWithin === 0 && ssBetween === 0) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  const msBetween = ssBetween / dfBetween;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  const statistic = msWithin === 0 ? Number.POSITIVE_INFINITY : msBetween / msWithin;
  const pvalue = fDistSF(statistic, dfBetween, dfWithin);
  return { statistic, pvalue };
}

/**
 * Jarque-Bera test for normality.
 *
 * Tests H₀: data comes from a normal distribution, based on sample skewness
 * and excess kurtosis. The statistic is JB = (n/6) × (S² + (K−3)²/4),
 * which is asymptotically χ²(2) under H₀.
 * Mirrors `scipy.stats.jarque_bera(data)`.
 *
 * @example
 * ```ts
 * const { statistic, pvalue } = jarqueBera([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * ```
 */
export function jarqueBera(data: readonly number[] | Series): HTestResult {
  const xs = toNumbers(data);
  const n = xs.length;
  if (n < 4) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  const m = mean(xs);
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const x of xs) {
    const d = x - m;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;
  if (m2 === 0) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  const skewness = m3 / m2 ** 1.5;
  const kurtosis = m4 / (m2 * m2);
  const statistic = (n / 6) * (skewness * skewness + ((kurtosis - 3) * (kurtosis - 3)) / 4);
  const pvalue = chi2SF(statistic, 2);
  return { statistic, pvalue };
}

/**
 * Pearson correlation coefficient and its p-value.
 *
 * The p-value is computed using the t-distribution with n − 2 degrees of
 * freedom: t = r × √((n−2) / (1−r²)).
 * Mirrors `scipy.stats.pearsonr(x, y)`.
 *
 * @returns `{ statistic, pvalue, correlation }` where statistic = r.
 *
 * @example
 * ```ts
 * const { correlation, pvalue } = pearsonr([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
 * ```
 */
export function pearsonr(
  x: readonly number[] | Series,
  y: readonly number[] | Series,
): PearsonrResult {
  const xs = toNumbers(x);
  const ys = toNumbers(y);
  const n = Math.min(xs.length, ys.length);
  if (n < 2) {
    return { statistic: Number.NaN, pvalue: Number.NaN, correlation: Number.NaN };
  }
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    const dy = (ys[i] as number) - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const denom = Math.sqrt(sxx * syy);
  if (denom === 0) {
    return { statistic: Number.NaN, pvalue: Number.NaN, correlation: Number.NaN };
  }
  const r = sxy / denom;
  const rClamped = Math.max(-1, Math.min(1, r));
  const ab = 1 - rClamped * rClamped;
  const statistic = rClamped;
  let pvalue: number;
  if (n < 3) {
    pvalue = Number.NaN; // degrees of freedom = n-2 < 1; p-value undefined
  } else if (ab <= 0) {
    pvalue = 0;
  } else {
    const tStat = rClamped * Math.sqrt((n - 2) / ab);
    pvalue = tPValue(tStat, n - 2, "two-sided");
  }
  return { statistic, pvalue, correlation: rClamped };
}

/**
 * Spearman rank-correlation coefficient and its p-value.
 *
 * Ranks both arrays (with average tie-breaking), computes the Pearson
 * correlation on the ranks, and derives the p-value from the t-distribution
 * (n − 2 df). Mirrors `scipy.stats.spearmanr(x, y)`.
 *
 * @returns `{ statistic, pvalue, correlation }` where statistic = ρ.
 *
 * @example
 * ```ts
 * const { correlation, pvalue } = spearmanr([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
 * ```
 */
export function spearmanr(
  x: readonly number[] | Series,
  y: readonly number[] | Series,
): SpearmanrResult {
  const xs = toNumbers(x);
  const ys = toNumbers(y);
  const n = Math.min(xs.length, ys.length);
  if (n < 3) {
    return { statistic: Number.NaN, pvalue: Number.NaN, correlation: Number.NaN };
  }
  const rx = averageRank(xs.slice(0, n));
  const ry = averageRank(ys.slice(0, n));
  const res = pearsonr(rx, ry);
  return { statistic: res.correlation, pvalue: res.pvalue, correlation: res.correlation };
}

/**
 * Mann-Whitney U test.
 *
 * Non-parametric test for whether one population tends to have larger values
 * than another. Uses the normal approximation for p-values.
 * Mirrors `scipy.stats.mannwhitneyu(x, y, use_continuity=True)`.
 *
 * @example
 * ```ts
 * const { statistic, pvalue } = mannWhitneyU([1, 2, 3], [4, 5, 6]);
 * ```
 */
export function mannWhitneyU(
  x: readonly number[] | Series,
  y: readonly number[] | Series,
  options: MannWhitneyUOptions = {},
): HTestResult {
  const alt = options.alternative ?? "two-sided";
  const correction = options.correction ?? true;
  const xs = toNumbers(x);
  const ys = toNumbers(y);
  const n1 = xs.length;
  const n2 = ys.length;
  if (n1 === 0 || n2 === 0) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  // Compute ranks on the combined array
  const combined = [...xs, ...ys];
  const ranks = averageRank(combined);
  let r1 = 0;
  for (let i = 0; i < n1; i++) {
    r1 += ranks[i] as number;
  }
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const statistic = Math.min(u1, u2);

  const muU = (n1 * n2) / 2;
  const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  if (sigmaU === 0) {
    return { statistic, pvalue: 1 };
  }
  const cc = correction ? 0.5 : 0;
  let pvalue: number;
  if (alt === "two-sided") {
    // Use min(u1, u2) shifted by cc toward muU
    const z = (Math.abs(statistic - muU) - cc) / sigmaU;
    pvalue = 2 * normalSF(z);
  } else if (alt === "greater") {
    // H1: x tends to be larger → U1 large; z > 0 means evidence for H1
    const z = (u1 - muU - cc) / sigmaU;
    pvalue = normalSF(z);
  } else {
    // H1: x tends to be smaller → U1 small; z < 0 means evidence for H1
    const z = (u1 - muU + cc) / sigmaU;
    pvalue = normalCDF(z);
  }
  return { statistic, pvalue: Math.min(1, Math.max(0, pvalue)) };
}

/**
 * One-sample Kolmogorov-Smirnov test.
 *
 * Tests whether `data` comes from the distribution specified by `cdf`.
 * Computes D = max|F_n(x) − F(x)| and uses the Kolmogorov asymptotic
 * distribution for the p-value. Mirrors `scipy.stats.kstest(data, cdf)`.
 *
 * @param data  Observations.
 * @param cdf  Cumulative distribution function of the null hypothesis.
 * @returns `{ statistic, pvalue }` where statistic is D.
 *
 * @example
 * ```ts
 * // Test whether data follows a standard normal distribution
 * const { statistic, pvalue } = kstest([0.1, 0.5, -0.3, 1.2], normalCdf);
 * ```
 */
export function kstest(
  data: readonly number[] | Series,
  cdf: CdfFn,
  options: KstestOptions = {},
): HTestResult {
  const alt = options.alternative ?? "two-sided";
  const xs = toNumbers(data).sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) {
    return { statistic: Number.NaN, pvalue: Number.NaN };
  }
  let dPlus = 0;
  let dMinus = 0;
  for (let i = 0; i < n; i++) {
    const fi = cdf(xs[i] as number);
    const empiricalUp = (i + 1) / n;
    const empiricalDown = i / n;
    dPlus = Math.max(dPlus, empiricalUp - fi);
    dMinus = Math.max(dMinus, fi - empiricalDown);
  }

  let statistic: number;
  let pvalue: number;
  if (alt === "two-sided") {
    statistic = Math.max(dPlus, dMinus);
    pvalue = kolmogorovSF(Math.sqrt(n) * statistic);
  } else if (alt === "greater") {
    statistic = dPlus;
    pvalue = kolmogorovSF(Math.sqrt(n) * statistic);
  } else {
    statistic = dMinus;
    pvalue = kolmogorovSF(Math.sqrt(n) * statistic);
  }
  return { statistic, pvalue: Math.min(1, Math.max(0, pvalue)) };
}
