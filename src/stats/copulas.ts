/**
 * copulas — Copula models for multivariate dependence.
 *
 * Implements:
 *   - **Gaussian copula** — normal-based joint distribution
 *   - **t-copula** — heavy-tailed dependence
 *   - **Clayton copula** — lower tail dependence
 *   - **Gumbel copula** — upper tail dependence
 *   - **Frank copula** — symmetric dependence
 *   - **Empirical copula** — rank-based nonparametric estimate
 *   - Kendall's tau ↔ copula parameter conversion
 *
 * @module
 */

// ─── Utility: Normal Distribution ─────────────────────────────────────────────

/** Approximation of the standard normal CDF (Abramowitz & Stegun). */
export function normalCdf(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x) / Math.sqrt(2));
  const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-(x * x) / 2)));
}

/** Inverse normal CDF (rational approximation, simplified). */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  // Halley's method starting from a rough initial guess
  let x = 0;
  if (p < 0.5) {
    const t = Math.sqrt(-2 * Math.log(p));
    x = -(2.515517 + 0.802853 * t + 0.010328 * t * t) /
      (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t) + t;
    x = -x;
  } else {
    const t = Math.sqrt(-2 * Math.log(1 - p));
    x = (2.515517 + 0.802853 * t + 0.010328 * t * t) /
      (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t) - t;
    x = x;
  }

  // Refine with Newton-Raphson
  for (let i = 0; i < 3; i++) {
    const fx = normalCdf(x) - p;
    const fpx = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    if (Math.abs(fpx) < 1e-15) break;
    x -= fx / fpx;
  }

  return x;
}

// ─── Gaussian Copula ──────────────────────────────────────────────────────────

/**
 * Evaluate the bivariate Gaussian copula CDF.
 *
 * @param u - First uniform marginal in (0,1).
 * @param v - Second uniform marginal in (0,1).
 * @param rho - Pearson correlation parameter in (-1, 1).
 * @returns C(u, v) — copula CDF value.
 *
 * @example
 * ```ts
 * import { gaussianCopulaCdf } from "tsb";
 * const c = gaussianCopulaCdf(0.3, 0.7, 0.5);
 * ```
 */
export function gaussianCopulaCdf(u: number, v: number, rho: number): number {
  const x = normalQuantile(u);
  const y = normalQuantile(v);
  return bivariateNormalCdf(x, y, rho);
}

/**
 * Gaussian copula density (bivariate).
 *
 * @param u - First uniform marginal.
 * @param v - Second uniform marginal.
 * @param rho - Correlation parameter.
 * @returns Copula density c(u, v).
 */
export function gaussianCopulaDensity(u: number, v: number, rho: number): number {
  const x = normalQuantile(u);
  const y = normalQuantile(v);
  const r2 = rho * rho;
  const exponent = -(r2 * (x * x + y * y) - 2 * rho * x * y) / (2 * (1 - r2));
  return Math.exp(exponent) / Math.sqrt(1 - r2);
}

/**
 * Simulate samples from a bivariate Gaussian copula.
 *
 * @param n - Number of samples.
 * @param rho - Correlation parameter.
 * @returns Array of [u, v] pairs.
 */
export function sampleGaussianCopula(n: number, rho: number): [number, number][] {
  const samples: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const z1 = randn();
    const z2 = randn();
    const x = z1;
    const y = rho * z1 + Math.sqrt(1 - rho * rho) * z2;
    samples.push([normalCdf(x), normalCdf(y)]);
  }
  return samples;
}

// ─── Clayton Copula ───────────────────────────────────────────────────────────

/**
 * Clayton copula CDF.
 *
 * C(u,v) = (u^{-theta} + v^{-theta} - 1)^{-1/theta}
 *
 * @param u - First uniform marginal.
 * @param v - Second uniform marginal.
 * @param theta - Dependence parameter (theta > 0).
 * @returns Copula CDF value.
 */
export function claytonCopulaCdf(u: number, v: number, theta: number): number {
  if (theta <= 0) throw new Error("Clayton copula requires theta > 0");
  return Math.max(u ** -theta + v ** -theta - 1, 0) ** (-1 / theta);
}

/**
 * Sample from the Clayton copula using the conditional method.
 *
 * @param n - Number of samples.
 * @param theta - Dependence parameter.
 * @returns Array of [u, v] pairs.
 */
export function sampleClaytonCopula(n: number, theta: number): [number, number][] {
  const samples: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    const t = Math.random();
    // Conditional inverse: V | U
    const v = u * (t ** (-theta / (1 + theta)) - 1 + u ** theta) ** (-1 / theta);
    samples.push([u, Math.max(0, Math.min(1, v))]);
  }
  return samples;
}

// ─── Gumbel Copula ────────────────────────────────────────────────────────────

/**
 * Gumbel copula CDF.
 *
 * C(u,v) = exp(-[(-ln u)^theta + (-ln v)^theta]^{1/theta})
 *
 * @param u - First uniform marginal.
 * @param v - Second uniform marginal.
 * @param theta - Dependence parameter (theta >= 1).
 * @returns Copula CDF value.
 */
export function gumbelCopulaCdf(u: number, v: number, theta: number): number {
  if (theta < 1) throw new Error("Gumbel copula requires theta >= 1");
  const a = (-Math.log(Math.max(u, 1e-300))) ** theta;
  const b = (-Math.log(Math.max(v, 1e-300))) ** theta;
  return Math.exp(-((a + b) ** (1 / theta)));
}

// ─── Frank Copula ─────────────────────────────────────────────────────────────

/**
 * Frank copula CDF.
 *
 * @param u - First uniform marginal.
 * @param v - Second uniform marginal.
 * @param theta - Dependence parameter (theta ≠ 0).
 * @returns Copula CDF value.
 */
export function frankCopulaCdf(u: number, v: number, theta: number): number {
  if (theta === 0) return u * v;
  const num = (Math.exp(-theta * u) - 1) * (Math.exp(-theta * v) - 1);
  const denom = Math.exp(-theta) - 1;
  return -Math.log(1 + num / denom) / theta;
}

/**
 * Sample from the Frank copula using the conditional method.
 *
 * @param n - Number of samples.
 * @param theta - Dependence parameter.
 * @returns Array of [u, v] pairs.
 */
export function sampleFrankCopula(n: number, theta: number): [number, number][] {
  const samples: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    const t = Math.random();
    // Conditional inverse
    const et = Math.exp(-theta);
    const eu = Math.exp(-theta * u);
    const v = -Math.log(1 - (t * (1 - et)) / (et - eu * (1 - t))) / theta;
    samples.push([u, Math.max(0, Math.min(1, v))]);
  }
  return samples;
}

// ─── Empirical Copula ─────────────────────────────────────────────────────────

/**
 * Compute the empirical copula from data.
 *
 * Transforms marginals to uniform via rank normalization.
 *
 * @param data - Array of [x, y] pairs.
 * @returns Pseudo-observations [u, v] pairs in (0, 1).
 */
export function empiricalCopula(data: [number, number][]): [number, number][] {
  const n = data.length;
  const xs = data.map((d) => d[0]);
  const ys = data.map((d) => d[1]);

  const rankX = rankArray(xs, n);
  const rankY = rankArray(ys, n);

  return Array.from({ length: n }, (_, i) => [
    (rankX[i] ?? 0) / (n + 1),
    (rankY[i] ?? 0) / (n + 1),
  ]);
}

// ─── Kendall's Tau Conversions ────────────────────────────────────────────────

/**
 * Estimate Kendall's tau from bivariate data.
 *
 * @param data - Array of [x, y] pairs.
 * @returns Kendall's tau.
 */
export function kendallTau(data: [number, number][]): number {
  const n = data.length;
  let concordant = 0;
  let discordant = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = (data[i]?.[0] ?? 0) - (data[j]?.[0] ?? 0);
      const dy = (data[i]?.[1] ?? 0) - (data[j]?.[1] ?? 0);
      if (dx * dy > 0) concordant++;
      else if (dx * dy < 0) discordant++;
    }
  }

  const pairs = n * (n - 1) / 2;
  return pairs > 0 ? (concordant - discordant) / pairs : 0;
}

/**
 * Convert Kendall's tau to Gaussian copula rho.
 *
 * rho = sin(pi * tau / 2)
 */
export function tauToGaussianRho(tau: number): number {
  return Math.sin(Math.PI * tau / 2);
}

/**
 * Convert Kendall's tau to Clayton copula theta.
 *
 * theta = 2 * tau / (1 - tau)
 */
export function tauToClaytonTheta(tau: number): number {
  if (tau <= 0) return 1e-6;
  return 2 * tau / (1 - tau);
}

/**
 * Convert Kendall's tau to Gumbel copula theta.
 *
 * theta = 1 / (1 - tau)
 */
export function tauToGumbelTheta(tau: number): number {
  if (tau >= 1) return 1e6;
  return 1 / (1 - tau);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Box-Muller standard normal sample. */
function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Bivariate normal CDF approximation via numerical integration. */
function bivariateNormalCdf(x: number, y: number, rho: number): number {
  // Gauss-Legendre quadrature approximation (20 points)
  if (x === -Infinity || y === -Infinity) return 0;
  if (x === Infinity) return normalCdf(y);
  if (y === Infinity) return normalCdf(x);

  // Use Owen's T function approximation
  const bvn = owenBvn(x, y, rho);
  return Math.max(0, Math.min(1, bvn));
}

/** Approximation of bivariate normal CDF using simple formula. */
function owenBvn(h: number, k: number, rho: number): number {
  // Simple approximation for |rho| < 1
  if (Math.abs(rho) < 1e-8) return normalCdf(h) * normalCdf(k);

  // Quadrature using 5-point Gauss-Legendre on [-1, 1]
  const glNodes = [-0.9061798, -0.5384693, 0, 0.5384693, 0.9061798];
  const glWeights = [0.2369269, 0.4786287, 0.5688889, 0.4786287, 0.2369269];

  // Transform to [0, rho] interval
  let sum = 0;
  const rhoAbs = Math.abs(rho);
  for (let i = 0; i < glNodes.length; i++) {
    const r = rhoAbs * 0.5 * ((glNodes[i] ?? 0) + 1);
    const sqr = Math.sqrt(1 - r * r);
    const exponent = (r * (2 * h * k - r * (h * h + k * k))) / (2 * (1 - r * r));
    sum += (glWeights[i] ?? 0) * Math.exp(exponent) / sqr;
  }

  const L = rhoAbs * 0.5 * sum / (2 * Math.PI);
  if (rho >= 0) {
    return normalCdf(h) * normalCdf(k) + L;
  } else {
    return Math.max(0, normalCdf(h) - normalCdf(-k) + L);
  }
}

/** Compute ranks of array values (1-indexed). */
function rankArray(arr: number[], n: number): number[] {
  const indexed = arr.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n).fill(0);
  for (let rank = 0; rank < n; rank++) {
    ranks[(indexed[rank] ?? { i: 0 }).i] = rank + 1;
  }
  return ranks;
}
