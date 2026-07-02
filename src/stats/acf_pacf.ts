/**
 * acf_pacf — Autocorrelation and partial autocorrelation functions.
 *
 * Mirrors `statsmodels.tsa.stattools.*` for time-series correlation analysis,
 * plus `pd.Series.autocorr`. Implemented from scratch with no external deps.
 *
 * Implemented functions:
 * - {@link autocorr}     — pandas-style single-lag autocorrelation
 * - {@link acf}          — full ACF with Bartlett confidence intervals
 * - {@link pacf}         — PACF via Levinson-Durbin recursion
 * - {@link ccf}          — cross-correlation function
 * - {@link durbinWatson} — Durbin-Watson statistic for residual autocorrelation
 * - {@link ljungBox}     — Ljung-Box portmanteau test
 * - {@link boxPierce}    — Box-Pierce portmanteau test
 *
 * @example
 * ```ts
 * import { acf, pacf, ljungBox } from "tsb";
 *
 * const x = [1, 2, 3, 2, 1, 2, 3, 2, 1, 0, 1, 2];
 * const { acf: corrs, lags } = acf(x, { nlags: 4, alpha: 0.05 });
 * const { pacf: partial }   = pacf(x, { nlags: 4 });
 * const { pvalue }          = ljungBox(x);
 * ```
 *
 * @module
 */

import { Series } from "../core/index.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Result from {@link acf}. */
export interface ACFResult {
  /** Autocorrelation coefficients; index 0 corresponds to lag 0 (= 1.0). */
  readonly acf: readonly number[];
  /**
   * Confidence interval bounds `[lower, upper]` for each lag, computed via
   * Bartlett's formula. `undefined` when `alpha` was not specified.
   */
  readonly confint: readonly [number, number][] | undefined;
  /** Lag indices corresponding to each coefficient. */
  readonly lags: readonly number[];
}

/** Result from {@link pacf}. */
export interface PACFResult {
  /** Partial autocorrelations; index 0 corresponds to lag 0 (= 1.0). */
  readonly pacf: readonly number[];
  /**
   * Confidence interval bounds `[lower, upper]` for each lag.
   * `undefined` when `alpha` was not specified.
   */
  readonly confint: readonly [number, number][] | undefined;
  /** Lag indices. */
  readonly lags: readonly number[];
}

/** Result from {@link ljungBox} or {@link boxPierce}. */
export interface PortmanteauResult {
  /** Q statistic at each tested lag. */
  readonly statistic: readonly number[];
  /** p-value at each tested lag (chi-squared df = lag − modelDf). */
  readonly pvalue: readonly number[];
  /** Lag indices that were tested. */
  readonly lags: readonly number[];
}

/** Options for {@link acf}. */
export interface ACFOptions {
  /** Maximum lag to compute (default: `min(floor(10·log₁₀(n)), n−1)`). */
  readonly nlags?: number;
  /**
   * Significance level for Bartlett confidence intervals (e.g. `0.05` → 95 % CI).
   * Omit (default) to skip CI computation.
   */
  readonly alpha?: number;
}

/** Options for {@link pacf}. */
export interface PACFOptions {
  /** Maximum lag (default: `min(floor(10·log₁₀(n)), floor(n/2)−1)`). */
  readonly nlags?: number;
  /**
   * Significance level for confidence intervals.
   * Omit (default) to skip CI computation.
   */
  readonly alpha?: number;
}

/** Options for {@link ccf}. */
export interface CCFOptions {
  /** Maximum lag (default: `min(floor(10·log₁₀(n)), n−1)`). */
  readonly nlags?: number;
  /**
   * Significance level for confidence intervals.
   * Omit (default) to skip CI computation.
   */
  readonly alpha?: number;
  /** When `true`, return only non-negative lags (default: `false`). */
  readonly positiveOnly?: boolean;
}

/** Options for {@link ljungBox} and {@link boxPierce}. */
export interface PortmanteauOptions {
  /**
   * Specific lag values to test, or a single maximum lag `h` (implying lags
   * `1, 2, …, h`). Default: `min(floor(10·log₁₀(n)), n−1)`.
   */
  readonly lags?: number | readonly number[];
  /**
   * Number of estimated AR/MA parameters already fit to the series (default: `0`).
   * The chi-squared degrees of freedom for lag `h` become `h − modelDf`.
   */
  readonly modelDf?: number;
}

// ─── internal type alias ──────────────────────────────────────────────────────

/** A numeric array or {@link Series} accepted by every public function. */
type NumericInput = readonly number[] | Series;

// ─── math helpers ─────────────────────────────────────────────────────────────

/** Lanczos approximation of log-Γ(z). */
function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1.0 - z);
  }
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let x = c[0] ?? 0;
  const zz = z - 1;
  for (let i = 1; i < g + 2; i++) {
    x += (c[i] ?? 0) / (zz + i);
  }
  const t = zz + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Regularised lower incomplete Γ via series expansion (x < a+1). */
function regIncGammaSeries(a: number, x: number, lnGa: number): number {
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n <= 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-10) {
      break;
    }
  }
  return Math.exp(-x + a * Math.log(x) - lnGa) * sum;
}

/** Regularised lower incomplete Γ via continued-fraction expansion (x ≥ a+1). */
function regIncGammaCF(a: number, x: number, lnGa: number): number {
  const eps = 1e-30;
  let f = eps;
  let c = f;
  let d = 1 / (x - a + 1 + eps);
  d = 1 / d;
  f = c * d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    const bn = x - a + 2 * i + 1;
    d = an * d + bn;
    c = bn + an / c;
    if (Math.abs(c) < eps) {
      c = eps;
    }
    d = 1 / (Math.abs(d) < eps ? eps : d);
    const del = c * d;
    f *= del;
    if (Math.abs(del - 1) < 1e-10) {
      break;
    }
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGa) * f;
}

/** Regularised lower incomplete Γ: P(a, x). */
function regIncGamma(a: number, x: number): number {
  if (x < 0) {
    return 0;
  }
  const lnGa = logGamma(a);
  if (x < a + 1) {
    return regIncGammaSeries(a, x, lnGa);
  }
  return regIncGammaCF(a, x, lnGa);
}

/** χ² survival function: P(χ²_df > x). */
function chi2sf(x: number, df: number): number {
  if (x <= 0) {
    return 1;
  }
  return 1 - regIncGamma(df / 2, x / 2);
}

/** Inverse standard-normal CDF (Peter Acklam's rational approximation). */
function normalPpf(p: number): number {
  if (p <= 0) {
    return Number.NEGATIVE_INFINITY;
  }
  if (p >= 1) {
    return Number.POSITIVE_INFINITY;
  }
  if (p === 0.5) {
    return 0;
  }
  const a0 = -3.969683028665376e1;
  const a1 = 2.209460984245205e2;
  const a2 = -2.759285104469687e2;
  const a3 = 1.38357751867269e2;
  const a4 = -3.066479806614716e1;
  const a5 = 2.506628277459239;
  const b0 = -5.447609879822406e1;
  const b1 = 1.615858368580409e2;
  const b2 = -1.556989798598866e2;
  const b3 = 6.680131188771972e1;
  const b4 = -1.328068155288572e1;
  const c0 = -7.784894002430293e-3;
  const c1 = -3.223964580411365e-1;
  const c2 = -2.400758277161838;
  const c3 = -2.549732539343734;
  const c4 = 4.374664141464968;
  const c5 = 2.938163982698783;
  const d0 = 7.784695709041462e-3;
  const d1 = 3.224671290700398e-1;
  const d2 = 2.445134137142996;
  const d3 = 3.754408661907416;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
      ((((d0 * q + d1) * q + d2) * q + d3) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a0 * r + a1) * r + a2) * r + a3) * r + a4) * r + a5) * q) /
      (((((b0 * r + b1) * r + b2) * r + b3) * r + b4) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
    ((((d0 * q + d1) * q + d2) * q + d3) * q + 1)
  );
}

// ─── tuple helpers ────────────────────────────────────────────────────────────

/** Build a `[lower, upper]` confidence bound tuple without a cast. */
function bound(center: number, margin: number): [number, number] {
  return [center - margin, center + margin];
}

// ─── array extraction ─────────────────────────────────────────────────────────

/** Extract a plain `number[]`, dropping NaN and non-numeric values. */
function toNumbers(input: NumericInput): number[] {
  if (input instanceof Series) {
    const out: number[] = [];
    for (const val of input.values) {
      if (typeof val === "number" && !Number.isNaN(val)) {
        out.push(val);
      }
    }
    return out;
  }
  return (input as readonly number[]).filter(
    (v) => typeof v === "number" && !Number.isNaN(v),
  );
}

// ─── autocovariance ────────────────────────────────────────────────────────────

/**
 * Biased sample autocovariance γ̂(0), γ̂(1), …, γ̂(nlags).
 * Denominator is n (consistent with pandas / statsmodels default).
 */
function autocovariance(x: readonly number[], mean: number, nlags: number): number[] {
  const n = x.length;
  const cov: number[] = [];
  for (let k = 0; k <= nlags; k++) {
    let s = 0;
    for (let t = 0; t < n - k; t++) {
      s += ((x[t] ?? 0) - mean) * ((x[t + k] ?? 0) - mean);
    }
    cov.push(s / n);
  }
  return cov;
}

// ─── ACF CI helper ────────────────────────────────────────────────────────────

/** Bartlett confidence intervals for ACF coefficients. */
function buildAcfCI(
  acfValues: readonly number[],
  n: number,
  alpha: number,
): [number, number][] {
  const z = normalPpf(1 - alpha / 2);
  const ci: [number, number][] = [];
  let sumSq = 0;
  for (let k = 0; k < acfValues.length; k++) {
    if (k === 0) {
      ci.push([1, 1]);
    } else {
      const se = Math.sqrt((1 + 2 * sumSq) / n);
      const r = acfValues[k] ?? 0;
      ci.push(bound(r, z * se));
      sumSq += r * r;
    }
  }
  return ci;
}

// ─── Levinson-Durbin helpers ──────────────────────────────────────────────────

/** Single Levinson-Durbin recursion step: returns [φ_kk, updated φ array]. */
function ldStep(
  acfVals: readonly number[],
  phi: readonly number[],
  k: number,
): [number, number[]] {
  let num = acfVals[k] ?? 0;
  let den = 1;
  for (let j = 1; j < k; j++) {
    num -= (phi[j - 1] ?? 0) * (acfVals[k - j] ?? 0);
    den -= (phi[j - 1] ?? 0) * (acfVals[j] ?? 0);
  }
  const phiKK = den === 0 ? 0 : num / den;
  const newPhi: number[] = [];
  for (let j = 1; j < k; j++) {
    newPhi.push((phi[j - 1] ?? 0) - phiKK * (phi[k - j - 1] ?? 0));
  }
  newPhi.push(phiKK);
  return [phiKK, newPhi];
}

/** Levinson-Durbin recursion returning PACF[0..nlags]. */
function levinsonDurbin(acfVals: readonly number[], nlags: number): number[] {
  const result: number[] = [1];
  if (nlags === 0) {
    return result;
  }
  let phi: number[] = [];
  for (let k = 1; k <= nlags; k++) {
    const [phiKK, newPhi] = ldStep(acfVals, phi, k);
    result.push(phiKK);
    phi = newPhi;
  }
  return result;
}

// ─── CCF helpers ──────────────────────────────────────────────────────────────

/** Cross-covariance at lag k (biased estimator, denominator = n). */
function ccfLag(
  xArr: readonly number[],
  yArr: readonly number[],
  n: number,
  xMean: number,
  yMean: number,
  k: number,
): number {
  const start = k >= 0 ? 0 : -k;
  const end = k >= 0 ? n - k : n;
  let s = 0;
  for (let t = start; t < end; t++) {
    s += ((xArr[t] ?? 0) - xMean) * ((yArr[t + k] ?? 0) - yMean);
  }
  return s / n;
}

// ─── portmanteau helpers ──────────────────────────────────────────────────────

/** Resolve the `lags` option to a sorted list. */
function resolveLags(opt: number | readonly number[] | undefined, maxLag: number): number[] {
  if (opt === undefined) {
    return [maxLag];
  }
  if (typeof opt === "number") {
    return Array.from({ length: opt }, (_, i) => i + 1);
  }
  return (opt as readonly number[]).slice().sort((a, b) => a - b);
}

/** Compute Ljung-Box or Box-Pierce Q at lag h. */
function portmanteauQ(
  acfVals: readonly number[],
  n: number,
  h: number,
  ljung: boolean,
): number {
  let q = 0;
  for (let k = 1; k <= h; k++) {
    const r = acfVals[k] ?? 0;
    q += ljung ? (r * r) / (n - k) : r * r;
  }
  return ljung ? n * (n + 2) * q : n * q;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Pandas-style single-lag autocorrelation.
 *
 * Equivalent to `pd.Series.autocorr(lag)` — computes the Pearson correlation
 * between `x[0..n−lag−1]` and `x[lag..n−1]`.
 *
 * @param x Input series.
 * @param lag Lag (default: `1`).
 * @returns Pearson correlation in `[−1, 1]`, or `NaN` if series is too short.
 */
export function autocorr(x: NumericInput, lag = 1): number {
  const arr = toNumbers(x);
  const n = arr.length;
  if (n <= lag + 1) {
    return Number.NaN;
  }
  const x1 = arr.slice(0, n - lag);
  const x2 = arr.slice(lag);
  const m1 = x1.reduce((s, v) => s + v, 0) / x1.length;
  const m2 = x2.reduce((s, v) => s + v, 0) / x2.length;
  let num = 0;
  let ss1 = 0;
  let ss2 = 0;
  for (let i = 0; i < x1.length; i++) {
    const d1 = (x1[i] ?? 0) - m1;
    const d2 = (x2[i] ?? 0) - m2;
    num += d1 * d2;
    ss1 += d1 * d1;
    ss2 += d2 * d2;
  }
  const denom = Math.sqrt(ss1 * ss2);
  return denom === 0 ? Number.NaN : num / denom;
}

/**
 * Full Autocorrelation Function (ACF) with optional Bartlett confidence
 * intervals.
 *
 * Mirrors `statsmodels.tsa.stattools.acf` (biased estimator, lag 0 = 1).
 *
 * @param x Input time series.
 * @param options See {@link ACFOptions}.
 * @returns ACF coefficients for lags 0…nlags, plus optional CI.
 */
export function acf(x: NumericInput, options: ACFOptions = {}): ACFResult {
  const arr = toNumbers(x);
  const n = arr.length;
  const defaultNlags = Math.min(Math.floor(10 * Math.log10(n)), n - 1);
  const nlags = Math.max(0, Math.min(options.nlags ?? defaultNlags, n - 1));
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const cov = autocovariance(arr, mean, nlags);
  const gamma0 = cov[0] ?? 1;
  const acfValues: number[] = cov.map((c) => (gamma0 === 0 ? 0 : c / gamma0));
  const lags = Array.from({ length: nlags + 1 }, (_, i) => i);
  const confint =
    options.alpha !== undefined ? buildAcfCI(acfValues, n, options.alpha) : undefined;
  return { acf: acfValues, confint, lags };
}

/**
 * Partial Autocorrelation Function (PACF) via the Levinson-Durbin recursion.
 *
 * Mirrors `statsmodels.tsa.stattools.pacf` (method `"yw"`).
 *
 * @param x Input time series.
 * @param options See {@link PACFOptions}.
 * @returns PACF coefficients for lags 0…nlags, plus optional CI.
 */
export function pacf(x: NumericInput, options: PACFOptions = {}): PACFResult {
  const arr = toNumbers(x);
  const n = arr.length;
  const defaultNlags = Math.min(Math.floor(10 * Math.log10(n)), Math.floor(n / 2) - 1);
  const maxAllowed = Math.max(0, Math.floor(n / 2) - 1);
  const nlags = Math.max(0, Math.min(options.nlags ?? defaultNlags, maxAllowed));
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const cov = autocovariance(arr, mean, nlags);
  const gamma0 = cov[0] ?? 1;
  const acfVals: number[] = cov.map((c) => (gamma0 === 0 ? 0 : c / gamma0));
  const pacfValues = levinsonDurbin(acfVals, nlags);
  const lags = Array.from({ length: nlags + 1 }, (_, i) => i);
  let confint: [number, number][] | undefined;
  if (options.alpha !== undefined) {
    const z = normalPpf(1 - options.alpha / 2);
    const se = 1 / Math.sqrt(n);
    confint = pacfValues.map((r) => bound(r, z * se));
  }
  return { pacf: pacfValues, confint, lags };
}

/**
 * Cross-Correlation Function (CCF) between two series.
 *
 * CCF(k) is the normalized cross-covariance at lag k:
 * `CCF(k) = C_xy(k) / (σ_x · σ_y)` where `C_xy(k)` uses denominator `n`.
 *
 * @param x First time series.
 * @param y Second time series (must have the same length as `x`).
 * @param options See {@link CCFOptions}.
 * @returns CCF coefficients for lags −nlags…+nlags (or 0…nlags).
 */
export function ccf(x: NumericInput, y: NumericInput, options: CCFOptions = {}): ACFResult {
  const xArr = toNumbers(x);
  const yArr = toNumbers(y);
  const n = Math.min(xArr.length, yArr.length);
  const defaultNlags = Math.min(Math.floor(10 * Math.log10(n)), n - 1);
  const nlags = Math.max(0, Math.min(options.nlags ?? defaultNlags, n - 1));
  const positiveOnly = options.positiveOnly ?? false;
  const xSub = xArr.slice(0, n);
  const ySub = yArr.slice(0, n);
  const xMean = xSub.reduce((s, v) => s + v, 0) / n;
  const yMean = ySub.reduce((s, v) => s + v, 0) / n;
  const xVar = xSub.reduce((s, v) => s + (v - xMean) ** 2, 0) / n;
  const yVar = ySub.reduce((s, v) => s + (v - yMean) ** 2, 0) / n;
  const xStd = Math.sqrt(xVar);
  const yStd = Math.sqrt(yVar);
  const denom = xStd * yStd;
  const startLag = positiveOnly ? 0 : -nlags;
  const lags: number[] = [];
  const values: number[] = [];
  for (let k = startLag; k <= nlags; k++) {
    lags.push(k);
    const cov = ccfLag(xSub, ySub, n, xMean, yMean, k);
    values.push(denom === 0 ? 0 : cov / denom);
  }
  let confint: [number, number][] | undefined;
  if (options.alpha !== undefined) {
    const z = normalPpf(1 - options.alpha / 2);
    const se = 1 / Math.sqrt(n);
    confint = values.map((r) => bound(r, z * se));
  }
  return { acf: values, confint, lags };
}

/**
 * Durbin-Watson statistic for autocorrelation in OLS residuals.
 *
 * `DW = Σ(eₜ − eₜ₋₁)² / Σeₜ²`
 *
 * | DW   | Interpretation               |
 * |------|------------------------------|
 * | ≈ 0  | Strong positive correlation  |
 * | ≈ 2  | No autocorrelation           |
 * | ≈ 4  | Strong negative correlation  |
 *
 * @param residuals OLS residual array or Series.
 * @returns Durbin-Watson statistic in `[0, 4]`.
 */
export function durbinWatson(residuals: NumericInput): number {
  const e = toNumbers(residuals);
  const n = e.length;
  if (n < 2) {
    return Number.NaN;
  }
  let diff2 = 0;
  let ss = (e[0] ?? 0) ** 2;
  for (let t = 1; t < n; t++) {
    const d = (e[t] ?? 0) - (e[t - 1] ?? 0);
    diff2 += d * d;
    ss += (e[t] ?? 0) ** 2;
  }
  return ss === 0 ? 2 : diff2 / ss;
}

/**
 * Ljung-Box Q test for serial autocorrelation up to lag `h`.
 *
 * `Q_LB(h) = n·(n+2) · Σₖ₌₁ʰ r̂ₖ² / (n−k)`
 *
 * H₀: the first `h` autocorrelations are all zero.
 * Rejection at small p-values indicates the series is not white noise.
 *
 * @param x Input time series.
 * @param options See {@link PortmanteauOptions}.
 * @returns Test statistic, p-value, and lag for each tested lag.
 */
export function ljungBox(x: NumericInput, options: PortmanteauOptions = {}): PortmanteauResult {
  return portmanteauTest(x, options, true);
}

/**
 * Box-Pierce Q test (simplified Ljung-Box).
 *
 * `Q_BP(h) = n · Σₖ₌₁ʰ r̂ₖ²`
 *
 * @param x Input time series.
 * @param options See {@link PortmanteauOptions}.
 * @returns Test statistic, p-value, and lag for each tested lag.
 */
export function boxPierce(x: NumericInput, options: PortmanteauOptions = {}): PortmanteauResult {
  return portmanteauTest(x, options, false);
}

/** Shared computation for Ljung-Box and Box-Pierce. */
function portmanteauTest(
  x: NumericInput,
  options: PortmanteauOptions,
  ljung: boolean,
): PortmanteauResult {
  const arr = toNumbers(x);
  const n = arr.length;
  const modelDf = options.modelDf ?? 0;
  const defaultMaxLag = Math.min(Math.floor(10 * Math.log10(n)), n - 1);
  const lagList = resolveLags(options.lags, defaultMaxLag);
  const hMax = lagList[lagList.length - 1] ?? defaultMaxLag;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const cov = autocovariance(arr, mean, hMax);
  const gamma0 = cov[0] ?? 1;
  const acfVals: number[] = cov.map((c) => (gamma0 === 0 ? 0 : c / gamma0));
  const statistic: number[] = [];
  const pvalue: number[] = [];
  for (const h of lagList) {
    const q = portmanteauQ(acfVals, n, h, ljung);
    const df = h - modelDf;
    statistic.push(q);
    pvalue.push(df > 0 ? chi2sf(q, df) : Number.NaN);
  }
  return { statistic, pvalue, lags: lagList };
}
