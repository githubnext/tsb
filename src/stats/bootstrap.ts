/**
 * bootstrap — non-parametric bootstrap confidence intervals.
 *
 * Mirrors `scipy.stats.bootstrap` (two-sided CIs) and `pandas` bootstrap
 * helpers. Implemented from scratch with no external dependencies.
 *
 * Implemented functions:
 * - {@link bootstrap}   — CI for any statistic; one or two paired samples
 * - {@link bootstrap1}  — convenience wrapper for a single sample
 *
 * Supported methods:
 * - `"percentile"` — simple percentile CI
 * - `"basic"`      — basic (reverse-percentile / pivoting) CI
 * - `"bca"`        — bias-corrected and accelerated (BCa)
 *
 * @example
 * ```ts
 * import { bootstrap } from "tsb";
 * const result = bootstrap([[1, 2, 3, 4, 5]], mean, { n: 1000, seed: 42 });
 * console.log(result.confidenceInterval); // { low: ..., high: ... }
 * ```
 *
 * @module
 */

// ─── math primitives ──────────────────────────────────────────────────────────

/**
 * Approximate erf(x) via Abramowitz & Stegun 7.1.26.
 * Max absolute error < 1.5×10⁻⁷.
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

/** Standard normal CDF Φ(x). */
function normalCdf(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.SQRT2));
}

/**
 * Inverse of the standard normal CDF (probit) using Peter Acklam's rational
 * approximation.  Maximum absolute error < 1.15×10⁻⁹.
 */
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

  // Rational approximation coefficients (Peter Acklam, 2010)
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

  let x: number;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
      ((((d0 * q + d1) * q + d2) * q + d3) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a0 * r + a1) * r + a2) * r + a3) * r + a4) * r + a5) * q) /
      (((((b0 * r + b1) * r + b2) * r + b3) * r + b4) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(
      (((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
      ((((d0 * q + d1) * q + d2) * q + d3) * q + 1)
    );
  }
  return x;
}

// ─── xorshift* PRNG ───────────────────────────────────────────────────────────

/** 64-bit xorshift* PRNG returning floats in [0, 1). */
function makeRng(seed: number): () => number {
  // Seed must be non-zero; mix with a constant to spread entropy.
  let s = BigInt(Math.round(seed)) ^ 0x6d2b79f5n;
  if (s === 0n) {
    s = 1n;
  }
  return () => {
    s ^= s >> 12n;
    s ^= s << 25n;
    s ^= s >> 27n;
    s &= 0xffff_ffff_ffff_ffffn;
    const r = (s * 0x2545f491_4f6cdd1dn) & 0xffff_ffff_ffff_ffffn;
    return Number(r >> 11n) / 2 ** 53;
  };
}

// ─── public types ─────────────────────────────────────────────────────────────

/** A statistic function accepting one sample. */
export type StatFn1 = (data: readonly number[]) => number;

/** A statistic function accepting two samples. */
export type StatFn2 = (a: readonly number[], b: readonly number[]) => number;

/** A statistic function operating on one or two samples. */
export type StatFn = StatFn1 | StatFn2;

/** Bootstrap CI method. */
export type BootstrapMethod = "percentile" | "basic" | "bca";

/** The CI low/high values. */
export interface ConfidenceInterval {
  /** Lower bound of the CI. */
  readonly low: number;
  /** Upper bound of the CI. */
  readonly high: number;
}

/** Result returned by {@link bootstrap}. */
export interface BootstrapResult {
  /** Estimated confidence interval. */
  readonly confidenceInterval: ConfidenceInterval;
  /** Bootstrap distribution of the statistic (length = n). */
  readonly bootDistribution: readonly number[];
  /** Standard error (std-dev of the bootstrap distribution). */
  readonly standardError: number;
}

/** Options for {@link bootstrap}. */
export interface BootstrapOptions {
  /**
   * Number of bootstrap resamples.
   * @default 9999
   */
  readonly n?: number;
  /**
   * Confidence level ∈ (0, 1).
   * @default 0.95
   */
  readonly confidence?: number;
  /**
   * CI method.
   * @default "bca"
   */
  readonly method?: BootstrapMethod;
  /**
   * Random seed for reproducibility.  Uses a seeded xorshift* PRNG when set.
   * If omitted the PRNG uses a time-based seed.
   */
  readonly seed?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Compute mean of xs. */
function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  return s / xs.length;
}

/** Compute standard deviation (population). */
function std(xs: readonly number[]): number {
  const m = mean(xs);
  let s = 0;
  for (const x of xs) {
    s += (x - m) ** 2;
  }
  return Math.sqrt(s / xs.length);
}

/**
 * Draw a bootstrap resample of length n from data using rng.
 */
function resample(data: readonly number[], n: number, rng: () => number): number[] {
  return Array.from({ length: n }, () => data[Math.floor(rng() * data.length)] ?? 0);
}

/**
 * Compute the quantile at probability p from a *sorted* array (linear
 * interpolation, matching numpy's default method).
 */
function quantileSorted(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  if (p <= 0) {
    return sorted[0] ?? Number.NaN;
  }
  if (p >= 1) {
    return sorted.at(-1) ?? Number.NaN;
  }
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = lo + 1;
  const frac = idx - lo;
  return (sorted[lo] ?? 0) * (1 - frac) + (sorted[hi] ?? sorted[lo] ?? 0) * frac;
}

/**
 * BCa acceleration factor from the jackknife pseudo-values.
 *
 * a = Σ(θ̄ - θᵢ)³ / (6 · (Σ(θ̄ - θᵢ)²)^(3/2))
 */
function bcaAcceleration(data: readonly number[], statFn: StatFn1): number {
  const n = data.length;
  const jkStats: number[] = [];
  for (let i = 0; i < n; i++) {
    const jk = data.filter((_, idx) => idx !== i);
    jkStats.push(statFn(jk));
  }
  const jkMean = mean(jkStats);
  let num = 0;
  let den = 0;
  for (const th of jkStats) {
    const d = jkMean - th;
    num += d ** 3;
    den += d ** 2;
  }
  if (den === 0) {
    return 0;
  }
  return num / (6 * den ** 1.5);
}

/**
 * BCa adjusted quantile levels.
 *
 * z0 = Φ⁻¹(B / n)  where B = #{θ̂_b < θ̂}
 * α₁ = Φ(z0 + (z0 + zα) / (1 − a·(z0 + zα)))
 * α₂ = Φ(z0 + (z0 + z_{1−α}) / (1 − a·(z0 + z_{1−α})))
 */
function bcaAlphas(
  bootDist: readonly number[],
  theta: number,
  a: number,
  alpha: number,
): { alpha1: number; alpha2: number } {
  const B = bootDist.filter((v) => v < theta).length;
  const z0 = normalPpf(B / bootDist.length);
  const zAlpha = normalPpf(alpha / 2);
  const zAlphaHigh = normalPpf(1 - alpha / 2);

  const adj = (z: number): number => {
    const num = z0 + z;
    const denom = 1 - a * num;
    if (denom === 0) {
      return z0 < 0 ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    }
    return z0 + num / denom;
  };

  return {
    alpha1: normalCdf(adj(zAlpha)),
    alpha2: normalCdf(adj(zAlphaHigh)),
  };
}

// ─── core implementation ───────────────────────────────────────────────────────

/**
 * Compute a bootstrap confidence interval for a statistic applied to one
 * or two independent samples.
 *
 * Mirrors `scipy.stats.bootstrap`.
 *
 * **Single-sample form**: `bootstrap([data], statFn, opts)` — `statFn` receives
 * one `readonly number[]` argument and returns a number.
 *
 * **Two-sample form**: `bootstrap([a, b], statFn, opts)` — `statFn` receives
 * two `readonly number[]` arguments.
 *
 * @example
 * ```ts
 * import { bootstrap } from "tsb";
 *
 * // 95% BCa CI for the mean of a single sample
 * const r = bootstrap([[1, 2, 3, 4, 5, 6, 7]], (d) => {
 *   let s = 0; for (const x of d) s += x; return s / d.length;
 * }, { n: 2000, seed: 0 });
 * console.log(r.confidenceInterval); // { low: ~2.4, high: ~5.6 }
 * ```
 */
export function bootstrap(
  samples: readonly [readonly number[]],
  statFn: StatFn1,
  options?: BootstrapOptions,
): BootstrapResult;
export function bootstrap(
  samples: readonly [readonly number[], readonly number[]],
  statFn: StatFn2,
  options?: BootstrapOptions,
): BootstrapResult;
export function bootstrap(
  samples: ReadonlyArray<readonly number[]>,
  statFn: StatFn1 | StatFn2,
  options: BootstrapOptions = {},
): BootstrapResult {
  const {
    n = 9999,
    confidence = 0.95,
    method = "bca",
    seed = Date.now() ^ (Math.random() * 0x7fff_ffff),
  } = options;

  if (confidence <= 0 || confidence >= 1) {
    throw new RangeError(`confidence must be in (0, 1); got ${confidence}`);
  }
  if (n < 1) {
    throw new RangeError(`n must be ≥ 1; got ${n}`);
  }
  const alpha = 1 - confidence;
  const rng = makeRng(seed);
  const data0 = samples[0] ?? [];

  if (samples.length >= 2) {
    const data1 = samples[1] ?? [];
    // Safe: overload ensures statFn is StatFn2 when two samples are provided.
    const fn2 = statFn as StatFn2;
    return bootstrapTwo(data0, data1, fn2, n, alpha, method, rng);
  }
  // Safe: overload ensures statFn is StatFn1 when one sample is provided.
  const fn1 = statFn as StatFn1;
  return bootstrapOne(data0, fn1, n, alpha, method, rng);
}

function bootstrapOne(
  data: readonly number[],
  fn: StatFn1,
  n: number,
  alpha: number,
  method: BootstrapMethod,
  rng: () => number,
): BootstrapResult {
  const theta = fn(data);
  const bootDist = Array.from({ length: n }, () => fn(resample(data, data.length, rng)));
  const sorted = [...bootDist].sort((a, b) => a - b);

  // Degenerate: all bootstrap samples yield the same statistic (e.g. n=1)
  if (sorted[0] === sorted[sorted.length - 1]) {
    const val = sorted[0] ?? theta;
    return {
      confidenceInterval: { low: val, high: val },
      bootDistribution: bootDist,
      standardError: 0,
    };
  }

  let low: number;
  let high: number;

  if (method === "percentile") {
    low = quantileSorted(sorted, alpha / 2);
    high = quantileSorted(sorted, 1 - alpha / 2);
  } else if (method === "basic") {
    const qLo = quantileSorted(sorted, alpha / 2);
    const qHi = quantileSorted(sorted, 1 - alpha / 2);
    low = 2 * theta - qHi;
    high = 2 * theta - qLo;
  } else {
    // BCa: jackknife acceleration + bias correction
    const a = bcaAcceleration(data, fn);
    const { alpha1, alpha2 } = bcaAlphas(sorted, theta, a, alpha);
    low = quantileSorted(sorted, alpha1);
    high = quantileSorted(sorted, alpha2);
  }

  return {
    confidenceInterval: { low, high },
    bootDistribution: bootDist,
    standardError: std(bootDist),
  };
}

function bootstrapTwo(
  data0: readonly number[],
  data1: readonly number[],
  fn: StatFn2,
  n: number,
  alpha: number,
  method: BootstrapMethod,
  rng: () => number,
): BootstrapResult {
  const theta = fn(data0, data1);
  const bootDist = Array.from({ length: n }, () => {
    const rs0 = resample(data0, data0.length, rng);
    const rs1 = resample(data1, data1.length, rng);
    return fn(rs0, rs1);
  });
  const sorted = [...bootDist].sort((a, b) => a - b);

  let low: number;
  let high: number;

  if (method === "percentile" || method === "bca") {
    // BCa for two samples falls back to percentile (jackknife not defined for paired)
    low = quantileSorted(sorted, alpha / 2);
    high = quantileSorted(sorted, 1 - alpha / 2);
  } else {
    // basic
    const qLo = quantileSorted(sorted, alpha / 2);
    const qHi = quantileSorted(sorted, 1 - alpha / 2);
    low = 2 * theta - qHi;
    high = 2 * theta - qLo;
  }

  return {
    confidenceInterval: { low, high },
    bootDistribution: bootDist,
    standardError: std(bootDist),
  };
}

/**
 * Convenience wrapper for bootstrapping a single-sample statistic.
 *
 * Equivalent to `bootstrap([[data]], statFn, options)`.
 *
 * @example
 * ```ts
 * import { bootstrap1 } from "tsb";
 * const r = bootstrap1([1, 2, 3, 4, 5], (d) => {
 *   let s = 0; for (const x of d) s += x; return s / d.length;
 * }, { n: 1000, seed: 1 });
 * console.log(r.confidenceInterval);
 * ```
 */
export function bootstrap1(
  data: readonly number[],
  statFn: StatFn1,
  options: BootstrapOptions = {},
): BootstrapResult {
  return bootstrap([data], statFn, options);
}
