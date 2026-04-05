/**
 * Bootstrap resampling for confidence intervals and standard errors.
 *
 * Mirrors `scipy.stats.bootstrap` and common pandas-adjacent bootstrap utilities.
 * Supports the **percentile** and **bias-corrected accelerated (BCa)** CI methods.
 *
 * @example
 * ```ts
 * import { bootstrapCI } from "tsb";
 *
 * const data = [2.1, 3.4, 1.8, 4.2, 2.9, 3.7, 2.5];
 * const ci = bootstrapCI(data, (s) => s.reduce((a, b) => a + b) / s.length);
 * // ci.estimate ≈ 2.94, ci.lower ≈ 2.3, ci.upper ≈ 3.6 (varies with randomness)
 * ```
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** Options for bootstrap confidence-interval estimation. */
export interface BootstrapOptions {
  /** Number of bootstrap resamples. Default 9 999. */
  nResamples?: number;
  /**
   * Significance level (two-tailed), in (0, 1).
   * 0.05 → 95 % CI.  Default 0.05.
   */
  alpha?: number;
  /**
   * Optional PRNG seed for reproducibility.
   * When provided a simple linear-congruential generator is seeded with this value.
   */
  seed?: number;
  /**
   * CI construction method.
   * - `"percentile"` (default) — use empirical quantiles of the bootstrap distribution.
   * - `"bca"` — bias-corrected accelerated; adjusts for median-bias and skewness.
   */
  method?: "percentile" | "bca";
}

/** Result of a bootstrap confidence-interval computation. */
export interface BootstrapResult {
  /** Lower confidence bound. */
  lower: number;
  /** Upper confidence bound. */
  upper: number;
  /** Point estimate (statistic applied to the original data). */
  estimate: number;
  /** Bootstrap standard error (std dev of the bootstrap distribution). */
  se: number;
  /** All bootstrap statistic values (length = nResamples). */
  bootstrapStats: readonly number[];
}

// ─── PRNG ─────────────────────────────────────────────────────────────────────

/** Simple 32-bit LCG state. */
type LCGState = { s: number };

/** Advance LCG and return next float in [0, 1). */
function lcgNext(state: LCGState): number {
  // Park-Miller constants (32-bit Lehmer generator)
  state.s = (Math.imul(state.s, 1664525) + 1013904223) >>> 0;
  return state.s / 4294967296;
}

/** Build a random-number function from an optional seed. */
function buildRng(seed: number | undefined): () => number {
  if (seed === undefined) {
    return (): number => Math.random();
  }
  const state: LCGState = { s: seed >>> 0 || 1 };
  return (): number => lcgNext(state);
}

// ─── statistical helpers ──────────────────────────────────────────────────────

/** Sort a numeric array in ascending order (returns a new array). */
function sortedAsc(arr: number[]): number[] {
  return arr.slice().sort((a, b) => a - b);
}

/** Empirical quantile via linear interpolation (p in [0, 1]). */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  if (p <= 0) {
    return sorted[0] ?? Number.NaN;
  }
  if (p >= 1) {
    return sorted.at(-1) ?? Number.NaN;
  }
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = lo + 1;
  const wHi = h - lo;
  const vLo = sorted[lo] ?? 0;
  const vHi = sorted[hi] ?? vLo;
  return vLo + wHi * (vHi - vLo);
}

/** Standard normal CDF using Abramowitz & Stegun approximation (error < 7.5e-8). */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const p = 1 - pdf * poly;
  return z >= 0 ? p : 1 - p;
}

/** Inverse normal CDF (rational approximation, |error| < 4.5e-4). */
function normPpf(p: number): number {
  if (p <= 0) {
    return Number.NEGATIVE_INFINITY;
  }
  if (p >= 1) {
    return Number.POSITIVE_INFINITY;
  }
  // Abramowitz & Stegun 26.2.23
  const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;
  const num = c0 + c1 * t + c2 * t * t;
  const den = 1 + d1 * t + d2 * t * t + d3 * t * t * t;
  const approx = t - num / den;
  return p < 0.5 ? -approx : approx;
}

/** Arithmetic mean of a non-empty array. */
function mean(vals: number[]): number {
  let s = 0;
  for (const v of vals) {
    s += v;
  }
  return s / vals.length;
}

/** Sample standard deviation (ddof=1). */
function stdDev(vals: number[]): number {
  if (vals.length < 2) {
    return Number.NaN;
  }
  const m = mean(vals);
  let v = 0;
  for (const x of vals) {
    v += (x - m) ** 2;
  }
  return Math.sqrt(v / (vals.length - 1));
}

// ─── bootstrap core ───────────────────────────────────────────────────────────

/**
 * Draw one bootstrap resample (with replacement) and compute the statistic.
 * Returns NaN if the statistic throws or returns a non-finite value.
 */
function oneSample(data: number[], statFn: (s: number[]) => number, rng: () => number): number {
  const n = data.length;
  const sample: number[] = new Array(n) as number[];
  for (let i = 0; i < n; i++) {
    sample[i] = data[Math.floor(rng() * n)] ?? 0;
  }
  try {
    return statFn(sample);
  } catch {
    return Number.NaN;
  }
}

/** Compute BCa CI bounds given bootstrap stats, original estimate, and jackknife estimates. */
function bcaBounds(
  bootstrapStats: number[],
  estimate: number,
  jackknife: number[],
  alpha: number,
): [number, number] {
  const sorted = sortedAsc(bootstrapStats);
  const n = bootstrapStats.length;

  // Bias-correction factor z0
  const countBelow = bootstrapStats.filter((v) => v < estimate).length;
  const z0 = normPpf(countBelow / n);

  // Acceleration factor a via jackknife
  const jMean = mean(jackknife);
  let num3 = 0;
  let den2 = 0;
  for (const jv of jackknife) {
    const diff = jMean - jv;
    num3 += diff ** 3;
    den2 += diff ** 2;
  }
  const accel = num3 / (6 * den2 ** 1.5 || 1);

  // Adjusted quantiles
  const za2 = normPpf(alpha / 2);
  const z1a2 = normPpf(1 - alpha / 2);

  const q1 = normCdf(z0 + (z0 + za2) / (1 - accel * (z0 + za2)));
  const q2 = normCdf(z0 + (z0 + z1a2) / (1 - accel * (z0 + z1a2)));

  return [quantile(sorted, q1), quantile(sorted, q2)];
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Compute a bootstrap confidence interval for a scalar statistic.
 *
 * @param data - Input data array (must be non-empty).
 * @param statFn - Function that takes a bootstrap resample and returns a number.
 * @param options - Bootstrap options (nResamples, alpha, seed, method).
 * @returns CI bounds, point estimate, bootstrap SE, and all bootstrap statistics.
 *
 * @example
 * ```ts
 * const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * // 95 % CI for the mean:
 * const ci = bootstrapCI(data, (s) => s.reduce((a, b) => a + b) / s.length, { seed: 42 });
 * ci.estimate; // 5.5
 * ```
 */
export function bootstrapCI(
  data: number[],
  statFn: (sample: number[]) => number,
  options?: BootstrapOptions,
): BootstrapResult {
  if (data.length === 0) {
    throw new RangeError("bootstrapCI: data must be non-empty");
  }
  const nResamples = options?.nResamples ?? 9999;
  const alpha = options?.alpha ?? 0.05;
  const method = options?.method ?? "percentile";
  const rng = buildRng(options?.seed);

  const estimate = statFn(data);
  const bStats: number[] = [];
  for (let i = 0; i < nResamples; i++) {
    bStats.push(oneSample(data, statFn, rng));
  }
  const finite = bStats.filter((v) => Number.isFinite(v));

  let lower: number;
  let upper: number;

  if (method === "bca") {
    // Jackknife estimates for BCa
    const jackknife: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const jk = data.filter((_, idx) => idx !== i);
      jackknife.push(statFn(jk));
    }
    [lower, upper] = bcaBounds(finite, estimate, jackknife, alpha);
  } else {
    const sorted = sortedAsc(finite);
    lower = quantile(sorted, alpha / 2);
    upper = quantile(sorted, 1 - alpha / 2);
  }

  return {
    lower,
    upper,
    estimate,
    se: stdDev(finite),
    bootstrapStats: bStats,
  };
}

/**
 * Bootstrap 95 % confidence interval for the mean.
 *
 * @example
 * ```ts
 * const ci = bootstrapMean([1, 2, 3, 4, 5], { seed: 0 });
 * ci.estimate; // 3
 * ```
 */
export function bootstrapMean(data: number[], options?: BootstrapOptions): BootstrapResult {
  return bootstrapCI(data, mean, options);
}

/**
 * Bootstrap 95 % confidence interval for the median.
 *
 * @example
 * ```ts
 * const ci = bootstrapMedian([1, 2, 3, 4, 5], { seed: 0 });
 * ci.estimate; // 3
 * ```
 */
export function bootstrapMedian(data: number[], options?: BootstrapOptions): BootstrapResult {
  return bootstrapCI(
    data,
    (s) => {
      const sorted = sortedAsc(s);
      return quantile(sorted, 0.5);
    },
    options,
  );
}

/**
 * Bootstrap 95 % confidence interval for the standard deviation (ddof=1).
 *
 * @example
 * ```ts
 * const ci = bootstrapStd([1, 2, 3, 4, 5], { seed: 0 });
 * ```
 */
export function bootstrapStd(data: number[], options?: BootstrapOptions): BootstrapResult {
  return bootstrapCI(data, stdDev, options);
}
