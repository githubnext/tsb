/**
 * kde — Kernel Density Estimation (KDE).
 *
 * Mirrors `scipy.stats.gaussian_kde` — a non-parametric density estimator
 * using Gaussian kernels. Implemented from scratch with no external
 * dependencies.
 *
 * Bandwidth selection follows scipy conventions:
 * - `"silverman"` (default) — `(4/(3n))^(1/5) * σ`
 * - `"scott"` — `n^(-1/5) * σ`
 * - A positive number — manually specified bandwidth (standard deviation of
 *   the kernel; equivalent to scipy's `bw_method` scalar which is the
 *   bandwidth **factor**, so `h = bw * σ`)
 *
 * Implemented:
 * - {@link gaussianKDE}  — factory function (mirrors `scipy.stats.gaussian_kde`)
 * - {@link GaussianKDE}  — fitted KDE with evaluate / pdf / logPdf /
 *                          integrate / resample / logpdf
 *
 * @example
 * ```ts
 * import { gaussianKDE } from "tsb";
 *
 * const kde = gaussianKDE([1, 2, 3, 4, 5]);
 * console.log(kde.pdf(3));          // ≈ 0.24
 * console.log(kde.evaluate([1, 2, 3]));  // array of densities
 * console.log(kde.integrate(2, 4)); // ≈ 0.55
 * ```
 *
 * @module
 */

import { Series } from "../core/index.ts";

// ─── internal math helpers ────────────────────────────────────────────────────

const SQRT_2PI = Math.sqrt(2 * Math.PI);
const LOG_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);

/** Standard Gaussian PDF: (1/√(2π)) exp(−u²/2). */
function gaussianKernel(u: number): number {
  return Math.exp(-0.5 * u * u) / SQRT_2PI;
}

/** Log of standard Gaussian PDF: −½ u² − log(√(2π)). */
function logGaussianKernel(u: number): number {
  return -0.5 * u * u - LOG_SQRT_2PI;
}

/** 64-bit xorshift* PRNG returning floats in [0, 1). */
function makeRng(seed: number): () => number {
  let s = BigInt(Math.round(seed)) ^ 0x6d2b79f5n;
  if (s === 0n) {
    s = 1n;
  }
  return () => {
    s ^= s >> 12n;
    s ^= s << 25n;
    s ^= s >> 27n;
    s = BigInt.asUintN(64, s);
    const frac = Number(BigInt.asUintN(52, (s * 0x2545f4914f6cdd1dn) >> 12n)) / 2 ** 52;
    return frac;
  };
}

/** Box-Muller transform: produce a standard normal sample from two U[0,1) values. */
function boxMuller(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(u1 + Number.EPSILON)) * Math.cos(2 * Math.PI * u2);
}

/** Sample mean of an array. */
function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  return s / xs.length;
}

/** Sample standard deviation (unbiased, ddof=1). */
function std(xs: readonly number[], mu?: number): number {
  const m = mu ?? mean(xs);
  let s = 0;
  for (const x of xs) {
    const d = x - m;
    s += d * d;
  }
  return Math.sqrt(s / (xs.length - 1));
}

/** Weighted mean. */
function weightedMean(xs: readonly number[], ws: readonly number[]): number {
  let sw = 0;
  let swx = 0;
  for (let i = 0; i < xs.length; i++) {
    const w = ws[i] ?? 1;
    sw += w;
    swx += w * (xs[i] ?? 0);
  }
  return swx / sw;
}

/** Weighted standard deviation (biased estimator, consistent with scipy). */
function weightedStd(xs: readonly number[], ws: readonly number[]): number {
  const mu = weightedMean(xs, ws);
  let sw = 0;
  let swd2 = 0;
  for (let i = 0; i < xs.length; i++) {
    const w = ws[i] ?? 1;
    const d = (xs[i] ?? 0) - mu;
    sw += w;
    swd2 += w * d * d;
  }
  return Math.sqrt(swd2 / sw);
}

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Options for {@link gaussianKDE}.
 */
export interface GaussianKDEOptions {
  /**
   * Bandwidth selection method.
   *
   * - `"silverman"` (default) — Silverman's rule-of-thumb: `(4/(3n))^(1/5) * σ`
   * - `"scott"` — Scott's rule: `n^(-1/5) * σ`
   * - A positive number — bandwidth **factor** (multiplied by σ of the data,
   *   consistent with scipy where a scalar means the factor, not the absolute
   *   bandwidth). Pass `{ bw_method: h / std(data) }` to specify an absolute
   *   bandwidth `h`.
   */
  readonly bw_method?: "silverman" | "scott" | number;

  /**
   * Optional sample weights (must be non-negative and sum to a positive value).
   * When provided the effective sample size is computed from the weights.
   */
  readonly weights?: readonly number[];
}

// ─── GaussianKDE ──────────────────────────────────────────────────────────────

/**
 * Non-parametric kernel density estimator using Gaussian kernels.
 *
 * Mirrors `scipy.stats.gaussian_kde`. Use {@link gaussianKDE} to construct.
 *
 * @example
 * ```ts
 * const kde = gaussianKDE([2, 3, 5, 8, 13]);
 * console.log(kde.pdf(5));             // ≈ 0.10
 * const xs = [0, 2.5, 5, 7.5, 10];
 * console.log(kde.evaluate(xs));       // array of densities
 * console.log(kde.integrate(3, 8));    // ≈ 0.55
 * const samples = kde.resample(100, 0);
 * ```
 */
export class GaussianKDE {
  /** Input dataset (read-only copy). */
  readonly dataset: readonly number[];
  /** Sample weights (uniform or user-supplied, normalised to sum 1). */
  readonly weights: readonly number[];

  /**
   * Bandwidth factor *h* (the kernel standard deviation).
   *
   * Consistent with `scipy.stats.gaussian_kde.factor` for unweighted KDEs.
   * For weighted KDEs `factor = bw_factor * σ_weighted`.
   */
  readonly factor: number;

  /**
   * Kernel variance = `factor²`.
   *
   * Consistent with `scipy.stats.gaussian_kde.covariance[0,0]` for 1-D data.
   */
  readonly covariance: number;

  /** Number of data points (length of {@link dataset}). */
  readonly n: number;

  // ── constructor (internal — use gaussianKDE()) ─────────────────────────────

  constructor(dataset: readonly number[], factor: number, weights: readonly number[]) {
    if (dataset.length === 0) {
      throw new RangeError("gaussianKDE: dataset must not be empty");
    }
    if (factor <= 0 || !Number.isFinite(factor)) {
      throw new RangeError(
        `gaussianKDE: bandwidth factor must be a positive finite number, got ${factor}`,
      );
    }
    this.dataset = dataset.slice();
    this.weights = weights.slice();
    this.factor = factor;
    this.covariance = factor * factor;
    this.n = dataset.length;
  }

  // ── evaluation ────────────────────────────────────────────────────────────

  /**
   * Evaluate the KDE at an array of points.
   *
   * Returns the probability density at each point (mirrors
   * `scipy.stats.gaussian_kde(points)`).
   *
   * @example
   * ```ts
   * const kde = gaussianKDE([1, 2, 3, 4, 5]);
   * kde.evaluate([0, 2.5, 5]);  // [0.04, 0.24, 0.07]
   * ```
   */
  evaluate(points: readonly number[]): number[] {
    const h = this.factor;
    const inv_h = 1 / h;
    const ds = this.dataset;
    const ws = this.weights;
    return points.map((x) => {
      let density = 0;
      for (let i = 0; i < ds.length; i++) {
        const u = ((ds[i] ?? 0) - x) * inv_h;
        density += (ws[i] ?? 0) * gaussianKernel(u);
      }
      return density * inv_h;
    });
  }

  /**
   * Evaluate the KDE at a single point.
   *
   * @example
   * ```ts
   * const kde = gaussianKDE([1, 2, 3, 4, 5]);
   * kde.pdf(3);  // ≈ 0.24
   * ```
   */
  pdf(x: number): number {
    const h = this.factor;
    const inv_h = 1 / h;
    const ds = this.dataset;
    const ws = this.weights;
    let density = 0;
    for (let i = 0; i < ds.length; i++) {
      const u = ((ds[i] ?? 0) - x) * inv_h;
      density += (ws[i] ?? 0) * gaussianKernel(u);
    }
    return density * inv_h;
  }

  /**
   * Log-probability density at a single point.
   *
   * Computed via log-sum-exp for numerical stability at very small densities
   * (mirrors `scipy.stats.gaussian_kde.logpdf(x)`).
   *
   * @example
   * ```ts
   * const kde = gaussianKDE([1, 2, 3]);
   * kde.logPdf(2);  // ≈ −0.9
   * ```
   */
  logPdf(x: number): number {
    // log f(x) = logsumexp_i( log(w_i) + logK((x_i−x)/h) ) − log(h)
    const h = this.factor;
    const inv_h = 1 / h;
    const ds = this.dataset;
    const ws = this.weights;

    const logTerms: number[] = new Array<number>(ds.length).fill(0);
    for (let i = 0; i < ds.length; i++) {
      const u = ((ds[i] ?? 0) - x) * inv_h;
      logTerms[i] = Math.log(ws[i] ?? Number.EPSILON) + logGaussianKernel(u);
    }

    let maxLog = logTerms[0] ?? Number.NEGATIVE_INFINITY;
    for (const l of logTerms) {
      if (l > maxLog) {
        maxLog = l;
      }
    }
    if (!Number.isFinite(maxLog)) {
      return Number.NEGATIVE_INFINITY;
    }
    let sum = 0;
    for (const l of logTerms) {
      sum += Math.exp(l - maxLog);
    }
    return maxLog + Math.log(sum) - Math.log(h);
  }

  /**
   * Log probability density at an array of points (mirrors
   * `scipy.stats.gaussian_kde.logpdf`).
   *
   * @example
   * ```ts
   * const kde = gaussianKDE([1, 2, 3]);
   * kde.logpdf([1, 2, 3]);  // array of log-densities
   * ```
   */
  logpdf(points: readonly number[]): number[] {
    return points.map((x) => this.logPdf(x));
  }

  // ── integration ───────────────────────────────────────────────────────────

  /**
   * Numerically integrate the KDE PDF over `[low, high]` using adaptive
   * Simpson's rule (1001 sub-intervals).
   *
   * Returns the approximate probability mass in the interval.
   *
   * @example
   * ```ts
   * const kde = gaussianKDE([0, 1, 2, 3, 4]);
   * kde.integrate(0, 4);   // ≈ 0.79 (most mass is in-range)
   * kde.integrate(-Infinity, Infinity);  // ≈ 1.0
   * ```
   */
  integrate(low: number, high: number, nPoints = 1001): number {
    if (low >= high) {
      return 0;
    }

    // Handle infinite bounds by clipping to ±6σ from data range.
    const sigma = this.factor;
    const dataMin = Math.min(...this.dataset);
    const dataMax = Math.max(...this.dataset);
    const clip = 6 * sigma + Math.max(Math.abs(dataMin), Math.abs(dataMax), sigma);

    const lo = Number.isFinite(low) ? low : low < 0 ? dataMin - clip : dataMax + clip;
    const hi = Number.isFinite(high) ? high : high > 0 ? dataMax + clip : dataMin - clip;

    if (lo >= hi) {
      return 0;
    }

    // Composite Simpson's rule with nPoints points (must be odd).
    const n = nPoints % 2 === 0 ? nPoints + 1 : nPoints;
    const h = (hi - lo) / (n - 1);
    let s = this.pdf(lo) + this.pdf(hi);
    for (let i = 1; i < n - 1; i++) {
      const x = lo + i * h;
      s += (i % 2 === 0 ? 2 : 4) * this.pdf(x);
    }
    return (s * h) / 3;
  }

  /**
   * Integrate the product of this KDE's PDF with another Gaussian KDE's PDF
   * analytically — mirrors `scipy.stats.gaussian_kde.integrate_gaussian`.
   *
   * For two Gaussian KDEs K₁ and K₂:
   *   ∫ K₁(x) K₂(x) dx = Σ_i Σ_j w_i w_j N(x_i − x_j; 0, h₁² + h₂²)
   *
   * @example
   * ```ts
   * const k1 = gaussianKDE([1, 2, 3]);
   * const k2 = gaussianKDE([2, 3, 4]);
   * k1.integrateGaussian(k2);  // analytic cross-integral
   * ```
   */
  integrateGaussian(other: GaussianKDE): number {
    const h2 = Math.sqrt(this.covariance + other.covariance);
    const inv_h2 = 1 / h2;
    const ds1 = this.dataset;
    const ws1 = this.weights;
    const ds2 = other.dataset;
    const ws2 = other.weights;

    let s = 0;
    for (let i = 0; i < ds1.length; i++) {
      for (let j = 0; j < ds2.length; j++) {
        const u = ((ds1[i] ?? 0) - (ds2[j] ?? 0)) * inv_h2;
        s += (ws1[i] ?? 0) * (ws2[j] ?? 0) * gaussianKernel(u) * inv_h2;
      }
    }
    return s;
  }

  // ── sampling ──────────────────────────────────────────────────────────────

  /**
   * Draw random samples from the KDE using the kernel-smoothed distribution.
   *
   * Algorithm: pick a random data point (weighted) then add Gaussian noise
   * with std = `factor`. Mirrors `scipy.stats.gaussian_kde.resample`.
   *
   * @param size Number of samples to draw.
   * @param seed Optional random seed for reproducibility.
   *
   * @example
   * ```ts
   * const kde = gaussianKDE([0, 1, 2, 3, 4]);
   * const samples = kde.resample(1000, 42);
   * ```
   */
  resample(size: number, seed?: number): number[] {
    const rng = makeRng(seed ?? Date.now() ^ Math.trunc(Math.random() * 0x7fff_ffff));
    const ds = this.dataset;
    const ws = this.weights;
    const n = ds.length;
    const h = this.factor;
    const out: number[] = new Array<number>(size).fill(0);

    // Build CDF for weighted selection.
    const cdf: number[] = new Array<number>(n).fill(0);
    let cumW = 0;
    for (let i = 0; i < n; i++) {
      cumW += ws[i] ?? 0;
      cdf[i] = cumW;
    }

    for (let s = 0; s < size; s++) {
      // Binary search for weighted random point.
      const u = rng() * cumW;
      let lo = 0;
      let hi = n - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if ((cdf[mid] ?? 0) < u) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      // Box-Muller normal sample.
      const u1 = Math.max(rng(), Number.EPSILON);
      const u2 = rng();
      out[s] = (ds[lo] ?? 0) + h * boxMuller(u1, u2);
    }
    return out;
  }

  // ── scipy-compat extras ───────────────────────────────────────────────────

  /**
   * Integrate the KDE from −∞ to +∞ (should equal 1 up to numerical error).
   *
   * Provided for parity with `scipy.stats.gaussian_kde.integrate_box_1d`.
   */
  integrateFull(): number {
    return this.integrate(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
  }

  /**
   * Integrate the KDE from −∞ to `x` (CDF evaluated at `x`).
   *
   * @example
   * ```ts
   * const kde = gaussianKDE([0, 1, 2, 3, 4]);
   * kde.cdf(2);  // ≈ 0.5
   * ```
   */
  cdf(x: number): number {
    return this.integrate(Number.NEGATIVE_INFINITY, x);
  }

  /**
   * Evaluate the KDE at an array of points; alias for {@link evaluate}.
   *
   * Provided for compatibility with `scipy.stats.gaussian_kde.__call__`.
   */
  call(points: readonly number[]): number[] {
    return this.evaluate(points);
  }

  /**
   * The effective sample size (neff) — for unweighted data this equals `n`.
   * For weighted data: `neff = (Σ w_i)² / Σ w_i²`.
   */
  get neff(): number {
    let sw = 0;
    let sw2 = 0;
    for (const w of this.weights) {
      sw += w;
      sw2 += w * w;
    }
    return (sw * sw) / sw2;
  }
}

// ─── factory function ─────────────────────────────────────────────────────────

/**
 * Create a Gaussian Kernel Density Estimator from a 1-D dataset.
 *
 * Mirrors `scipy.stats.gaussian_kde(dataset, bw_method, weights)`.
 *
 * @param data Input data — array of numbers or a `Series`.
 * @param options Bandwidth selection and optional weights.
 *
 * @example
 * ```ts
 * import { gaussianKDE } from "tsb";
 *
 * const data = [2.1, 3.4, 3.9, 2.7, 4.8, 5.1, 3.3, 4.0];
 * const kde = gaussianKDE(data);
 *
 * // Evaluate at a grid of points
 * const xs = Array.from({ length: 100 }, (_, i) => 1 + i * 0.05);
 * const ys = kde.evaluate(xs);
 *
 * // Probability mass between 3 and 5
 * console.log(kde.integrate(3, 5));  // ≈ 0.55
 *
 * // Bandwidth
 * console.log(kde.factor);  // ≈ 0.63
 * ```
 */
export function gaussianKDE(
  data: readonly number[] | Series,
  options: GaussianKDEOptions = {},
): GaussianKDE {
  // Convert Series to plain number[].
  let arr: number[];
  if (data instanceof Series) {
    arr = [];
    for (const val of data.values) {
      if (typeof val === "number") {
        arr.push(val);
      }
    }
  } else {
    arr = Array.from(data);
  }

  if (arr.length === 0) {
    throw new RangeError("gaussianKDE: data must not be empty (at least one element required)");
  }
  if (arr.length === 1) {
    throw new RangeError(
      "gaussianKDE: data must contain at least 2 elements to estimate bandwidth",
    );
  }

  // Validate / normalise weights.
  let ws: number[];
  if (options.weights !== undefined) {
    if (options.weights.length !== arr.length) {
      throw new RangeError(
        `gaussianKDE: weights length (${options.weights.length}) must equal data length (${arr.length})`,
      );
    }
    let sw = 0;
    for (const w of options.weights) {
      if (w < 0 || !Number.isFinite(w)) {
        throw new RangeError("gaussianKDE: all weights must be non-negative finite numbers");
      }
      sw += w;
    }
    if (sw <= 0) {
      throw new RangeError("gaussianKDE: weights must sum to a positive number");
    }
    ws = options.weights.map((w) => w / sw);
  } else {
    const unifW = 1 / arr.length;
    ws = new Array<number>(arr.length).fill(unifW);
  }

  // Compute standard deviation (needed for bandwidth rules).
  let sigma: number;
  if (options.weights !== undefined) {
    sigma = weightedStd(arr, ws);
  } else {
    sigma = std(arr);
  }

  if (sigma <= 0 || !Number.isFinite(sigma)) {
    throw new RangeError(
      "gaussianKDE: data has zero or undefined variance — cannot estimate bandwidth. " +
        "All values are identical or data contains non-finite values.",
    );
  }

  // Effective sample size.
  let neff: number;
  if (options.weights !== undefined) {
    let sw2 = 0;
    for (const w of ws) {
      sw2 += w * w;
    }
    neff = 1 / sw2;
  } else {
    neff = arr.length;
  }

  // Bandwidth factor.
  let bwFactor: number;
  const bwMethod = options.bw_method ?? "silverman";
  if (bwMethod === "silverman") {
    // h = (4/(3*n))^(1/5) * σ
    bwFactor = (4 / (3 * neff)) ** 0.2 * sigma;
  } else if (bwMethod === "scott") {
    // h = n^(-1/5) * σ
    bwFactor = neff ** -0.2 * sigma;
  } else {
    // Scalar factor: h = bw_method * σ  (consistent with scipy)
    if (bwMethod <= 0 || !Number.isFinite(bwMethod)) {
      throw new RangeError(
        `gaussianKDE: bw_method as a number must be positive and finite, got ${bwMethod}`,
      );
    }
    bwFactor = bwMethod * sigma;
  }

  return new GaussianKDE(arr, bwFactor, ws);
}
