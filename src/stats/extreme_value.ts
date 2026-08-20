/**
 * extreme_value — Extreme Value Theory (EVT) distributions and analysis.
 *
 * Implements:
 *   - **Generalized Extreme Value (GEV)** distribution (Gumbel, Fréchet, Weibull)
 *   - **Generalized Pareto Distribution (GPD)** for Peaks Over Threshold
 *   - **Block maxima** method (GEV fitting via L-moments)
 *   - **Peaks Over Threshold (POT)** method (GPD fitting via MLE)
 *   - **Return level** and **return period** calculations
 *   - **Gumbel**, **Fréchet**, **Weibull** special-case distributions
 *
 * @module
 */

// ─── GEV Distribution ─────────────────────────────────────────────────────────

/**
 * Parameters of the Generalized Extreme Value distribution.
 */
export interface GEVParams {
  /** Location parameter (mu). */
  mu: number;
  /** Scale parameter (sigma > 0). */
  sigma: number;
  /** Shape parameter (xi). xi=0: Gumbel, xi>0: Fréchet, xi<0: Weibull. */
  xi: number;
}

/**
 * GEV probability density function.
 *
 * @param x - Value.
 * @param params - GEV parameters.
 * @returns Density f(x).
 *
 * @example
 * ```ts
 * import { gevPdf } from "tsb";
 * const p = gevPdf(2.5, { mu: 0, sigma: 1, xi: 0.1 });
 * ```
 */
export function gevPdf(x: number, params: GEVParams): number {
  const { mu, sigma, xi } = params;
  if (sigma <= 0) return 0;

  const z = (x - mu) / sigma;

  if (Math.abs(xi) < 1e-8) {
    // Gumbel case (xi → 0)
    const t = Math.exp(-z);
    return (1 / sigma) * Math.exp(-z - t);
  }

  const t = 1 + xi * z;
  if (t <= 0) return 0;

  return (1 / sigma) * t ** (-1 / xi - 1) * Math.exp(-(t ** (-1 / xi)));
}

/**
 * GEV cumulative distribution function.
 *
 * @param x - Value.
 * @param params - GEV parameters.
 * @returns CDF F(x).
 */
export function gevCdf(x: number, params: GEVParams): number {
  const { mu, sigma, xi } = params;
  if (sigma <= 0) return 0;

  const z = (x - mu) / sigma;

  if (Math.abs(xi) < 1e-8) {
    // Gumbel case
    return Math.exp(-Math.exp(-z));
  }

  const t = 1 + xi * z;
  if (t <= 0) {
    return xi > 0 ? 0 : 1;
  }

  return Math.exp(-(t ** (-1 / xi)));
}

/**
 * GEV quantile function (inverse CDF).
 *
 * @param p - Probability in (0, 1).
 * @param params - GEV parameters.
 * @returns Quantile x such that F(x) = p.
 */
export function gevQuantile(p: number, params: GEVParams): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const { mu, sigma, xi } = params;

  if (Math.abs(xi) < 1e-8) {
    // Gumbel
    return mu - sigma * Math.log(-Math.log(p));
  }

  return mu + (sigma / xi) * ((-Math.log(p)) ** (-xi) - 1);
}

/**
 * Compute return level for a given return period (years/blocks).
 *
 * @param returnPeriod - Return period (e.g., 100 for 100-year event).
 * @param params - GEV parameters.
 * @returns Return level x such that P(X > x) = 1/returnPeriod.
 */
export function gevReturnLevel(returnPeriod: number, params: GEVParams): number {
  const p = 1 - 1 / returnPeriod;
  return gevQuantile(p, params);
}

// ─── GEV Fitting (L-moments) ──────────────────────────────────────────────────

/**
 * Fit GEV distribution to block maxima using L-moments.
 *
 * @param maxima - Array of block maxima (e.g., annual maxima).
 * @returns Estimated GEV parameters.
 *
 * @example
 * ```ts
 * import { fitGEV } from "tsb";
 * const annualMaxima = [12.3, 15.1, 9.8, 18.2, 11.4, 14.7];
 * const params = fitGEV(annualMaxima);
 * ```
 */
export function fitGEV(maxima: number[]): GEVParams {
  const n = maxima.length;
  if (n < 3) return { mu: 0, sigma: 1, xi: 0 };

  const sorted = [...maxima].sort((a, b) => a - b);

  // Compute L-moments via probability-weighted moments
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;

  for (let i = 0; i < n; i++) {
    b0 += sorted[i] ?? 0;
    b1 += ((i) / (n - 1)) * (sorted[i] ?? 0);
    b2 += ((i) * (i - 1) / ((n - 1) * (n - 2))) * (sorted[i] ?? 0);
  }
  b0 /= n;
  b1 /= n;
  b2 /= n;

  const l1 = b0;
  const l2 = 2 * b1 - b0;
  const l3 = 6 * b2 - 6 * b1 + b0;

  // L-skewness
  const tau3 = l2 > 1e-10 ? l3 / l2 : 0;

  // Estimate xi from L-skewness using approximation
  let xi: number;
  if (Math.abs(tau3) < 1e-8) {
    xi = 0;
  } else {
    // Rational approximation for xi from tau3
    xi = estimateXiFromTau3(tau3);
  }

  let sigma: number;
  let mu: number;

  if (Math.abs(xi) < 1e-6) {
    // Gumbel
    sigma = l2 / Math.log(2);
    mu = l1 - 0.5772156649 * sigma;
  } else {
    const g1 = gamma(1 - xi);
    sigma = (l2 * xi) / ((1 - 2 ** (-xi)) * g1);
    mu = l1 - sigma * (g1 - 1) / xi;
  }

  return {
    mu,
    sigma: Math.max(sigma, 1e-8),
    xi,
  };
}

// ─── GPD Distribution ─────────────────────────────────────────────────────────

/**
 * Parameters of the Generalized Pareto Distribution.
 */
export interface GPDParams {
  /** Threshold (u). */
  threshold: number;
  /** Scale parameter (sigma > 0). */
  sigma: number;
  /** Shape parameter (xi). */
  xi: number;
}

/**
 * GPD probability density function.
 *
 * @param x - Value (must be >= threshold).
 * @param params - GPD parameters.
 * @returns Density f(x).
 */
export function gpdPdf(x: number, params: GPDParams): number {
  const { threshold, sigma, xi } = params;
  if (sigma <= 0 || x < threshold) return 0;

  const z = (x - threshold) / sigma;

  if (Math.abs(xi) < 1e-8) {
    return (1 / sigma) * Math.exp(-z);
  }

  const t = 1 + xi * z;
  if (t <= 0) return 0;

  return (1 / sigma) * t ** (-1 / xi - 1);
}

/**
 * GPD cumulative distribution function.
 *
 * @param x - Value.
 * @param params - GPD parameters.
 * @returns CDF value.
 */
export function gpdCdf(x: number, params: GPDParams): number {
  const { threshold, sigma, xi } = params;
  if (x < threshold) return 0;

  const z = (x - threshold) / sigma;

  if (Math.abs(xi) < 1e-8) {
    return 1 - Math.exp(-z);
  }

  const t = 1 + xi * z;
  if (t <= 0) return xi > 0 ? 0 : 1;

  return 1 - t ** (-1 / xi);
}

/**
 * GPD quantile function.
 *
 * @param p - Probability in (0, 1).
 * @param params - GPD parameters.
 * @returns Quantile.
 */
export function gpdQuantile(p: number, params: GPDParams): number {
  if (p <= 0) return params.threshold;
  if (p >= 1) return Infinity;

  const { threshold, sigma, xi } = params;

  if (Math.abs(xi) < 1e-8) {
    return threshold - sigma * Math.log(1 - p);
  }

  return threshold + (sigma / xi) * ((1 - p) ** (-xi) - 1);
}

// ─── GPD Fitting (MLE) ────────────────────────────────────────────────────────

/**
 * Fit GPD to exceedances above a threshold using MLE.
 *
 * @param data - Full dataset.
 * @param threshold - Threshold u (only exceedances x > u are used).
 * @returns Estimated GPD parameters.
 *
 * @example
 * ```ts
 * import { fitGPD } from "tsb";
 * const data = [1.2, 0.5, 3.4, 8.1, 0.2, 5.6, 12.3, 0.8, 4.1, 7.2];
 * const params = fitGPD(data, 4.0);
 * ```
 */
export function fitGPD(data: number[], threshold: number): GPDParams {
  const exceedances = data.filter((x) => x > threshold).map((x) => x - threshold);

  if (exceedances.length < 2) {
    return { threshold, sigma: 1, xi: 0 };
  }

  const n = exceedances.length;
  const mean = exceedances.reduce((s, x) => s + x, 0) / n;
  const variance = exceedances.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);

  // Method of moments starting values
  let sigmaInit = mean * (mean * mean / variance + 1) / 2;
  let xiInit = (mean * mean / variance - 1) / 2;

  sigmaInit = Math.max(sigmaInit, 1e-6);

  // Simple gradient-free optimization (Nelder-Mead would be ideal, use grid search)
  const { sigma, xi } = optimizeGPD(exceedances, sigmaInit, xiInit);

  return { threshold, sigma, xi };
}

// ─── Peaks Over Threshold Analysis ───────────────────────────────────────────

/**
 * Extract exceedances above a threshold.
 *
 * @param data - Time series data.
 * @param threshold - Threshold value.
 * @returns Array of exceedance values.
 */
export function extractExceedances(data: number[], threshold: number): number[] {
  return data.filter((x) => x > threshold);
}

/**
 * Compute return level from GPD fit.
 *
 * @param returnPeriod - Return period.
 * @param params - Fitted GPD parameters.
 * @param lambda - Rate of threshold exceedances (exceedances per time unit).
 * @returns Return level.
 */
export function gpdReturnLevel(
  returnPeriod: number,
  params: GPDParams,
  lambda: number,
): number {
  const p = 1 - 1 / (returnPeriod * lambda);
  return gpdQuantile(Math.max(0, Math.min(1, p)), params);
}

// ─── Gumbel Distribution ──────────────────────────────────────────────────────

/** Parameters for the Gumbel distribution (GEV with xi=0). */
export interface GumbelParams {
  /** Location (mu). */
  mu: number;
  /** Scale (beta > 0). */
  beta: number;
}

/** Gumbel PDF. */
export function gumbelPdf(x: number, params: GumbelParams): number {
  const z = (x - params.mu) / params.beta;
  return (1 / params.beta) * Math.exp(-(z + Math.exp(-z)));
}

/** Gumbel CDF. */
export function gumbelCdf(x: number, params: GumbelParams): number {
  const z = (x - params.mu) / params.beta;
  return Math.exp(-Math.exp(-z));
}

/** Gumbel quantile. */
export function gumbelQuantile(p: number, params: GumbelParams): number {
  return params.mu - params.beta * Math.log(-Math.log(p));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Lanczos approximation of the gamma function. */
function gamma(z: number): number {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0] ?? 0;
  const zr = z - 1;
  for (let i = 1; i < g + 2; i++) {
    x += (c[i] ?? 0) / (zr + i);
  }
  const t = zr + g + 0.5;
  return Math.sqrt(2 * Math.PI) * t ** (zr + 0.5) * Math.exp(-t) * x;
}

/** Estimate GEV shape parameter from L-skewness. */
function estimateXiFromTau3(tau3: number): number {
  // Approximation from Hosking (1985)
  // For Gumbel: tau3 = 0.1699 (log(3/2) / log(2) - 2)
  // Valid for -0.5 < xi < 0.5
  const c = 2 / (3 + tau3) - Math.log(2) / Math.log(3);
  return 7.8590 * c + 2.9554 * c * c;
}

/** Simple optimization for GPD parameters. */
function optimizeGPD(
  exceedances: number[],
  sigmaInit: number,
  xiInit: number,
): { sigma: number; xi: number } {
  let sigma = sigmaInit;
  let xi = xiInit;

  const logLik = (s: number, x: number): number => {
    const n = exceedances.length;
    if (s <= 0) return -Infinity;
    let ll = -n * Math.log(s);
    for (const e of exceedances) {
      if (Math.abs(x) < 1e-8) {
        ll -= e / s;
      } else {
        const t = 1 + x * e / s;
        if (t <= 0) return -Infinity;
        ll -= (1 / x + 1) * Math.log(t);
      }
    }
    return ll;
  };

  // Simple coordinate ascent
  let bestLl = logLik(sigma, xi);
  for (let iter = 0; iter < 100; iter++) {
    const stepS = sigma * 0.1;
    const stepX = 0.05;

    for (const ds of [-stepS, stepS]) {
      const ll = logLik(sigma + ds, xi);
      if (ll > bestLl) {
        bestLl = ll;
        sigma = sigma + ds;
      }
    }
    for (const dx of [-stepX, stepX]) {
      const ll = logLik(sigma, xi + dx);
      if (ll > bestLl) {
        bestLl = ll;
        xi = xi + dx;
      }
    }
  }

  return { sigma: Math.max(sigma, 1e-8), xi };
}
