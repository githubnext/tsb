/**
 * ets — Exponential Smoothing / Holt-Winters ETS models.
 *
 * Implements the classical additive-error ETS state-space framework:
 *   - **SimpleExpSmoothing** (SES / ETS(A,N,N)): single level parameter α.
 *   - **Holt** (ETS(A,A,N) / ETS(A,Ad,N)): level α + trend β, optional damping φ.
 *   - **ExponentialSmoothing** (Holt-Winters ETS(·,·,·)): full model with additive
 *     or multiplicative trend and seasonal components.
 *
 * Parameter estimation minimises SSE via Nelder-Mead simplex.
 * Heuristic initialisation follows statsmodels conventions.
 *
 * API mirrors `statsmodels.tsa.holtwinters`.
 *
 * @example
 * ```ts
 * import { ExponentialSmoothing } from "tsb";
 *
 * const sales = [17, 21, 23, 18, 22, 26, 19, 24, 27, 20, 25, 28];
 * const model = new ExponentialSmoothing({ trend: "add", seasonal: "add", seasonalPeriods: 4 });
 * const fit = model.fit(sales);
 * console.log(fit.alpha, fit.beta, fit.gamma);
 * console.log(model.forecast(4)); // 4-step ahead forecasts
 * ```
 *
 * @module
 */

import type { Series } from "../core/series.ts";

// ─── Public types ──────────────────────────────────────────────────────────────

/** Trend component type: additive, multiplicative, or absent. */
export type ETSTrend = "add" | "mul" | null;

/** Seasonal component type: additive, multiplicative, or absent. */
export type ETSSeasonal = "add" | "mul" | null;

/** Initialisation strategy for state variables. */
export type ETSInit = "heuristic" | "known";

// ── SimpleExpSmoothing ────────────────────────────────────────────────────────

/** Options for {@link SimpleExpSmoothing}. */
export interface SESOptions {
  /**
   * Smoothing level parameter (0 < α < 1).
   * If omitted the parameter is estimated by minimising SSE.
   */
  readonly alpha?: number;
  /** Initial level value.  If omitted, set to `y[0]`. */
  readonly initialLevel?: number;
}

/** Result returned by {@link SimpleExpSmoothing.fit}. */
export interface SESFitResult {
  /** Estimated smoothing level. */
  readonly alpha: number;
  /** Initial level l₀. */
  readonly initialLevel: number;
  /** In-sample one-step-ahead fitted values. */
  readonly fittedValues: readonly number[];
  /** In-sample residuals e_t = y_t − ŷ_t. */
  readonly residuals: readonly number[];
  /** Sum of squared errors. */
  readonly sse: number;
  /** Akaike Information Criterion. */
  readonly aic: number;
  /** Bayesian Information Criterion. */
  readonly bic: number;
  /** Corrected AIC. */
  readonly aicc: number;
}

// ── Holt ─────────────────────────────────────────────────────────────────────

/** Options for {@link Holt}. */
export interface HoltOptions {
  /** Smoothing level (0 < α < 1). Auto-estimated if omitted. */
  readonly alpha?: number;
  /** Smoothing trend (0 < β < 1). Auto-estimated if omitted. */
  readonly beta?: number;
  /** Whether to apply a damped trend. Default `false`. */
  readonly damped?: boolean;
  /**
   * Damping coefficient (0 < φ < 1).
   * Only used when `damped` is `true`.  Auto-estimated if omitted.
   */
  readonly dampingSlope?: number;
  /** Initial level l₀. Heuristic if omitted. */
  readonly initialLevel?: number;
  /** Initial trend b₀. Heuristic if omitted. */
  readonly initialTrend?: number;
}

/** Result returned by {@link Holt.fit}. */
export interface HoltFitResult {
  /** Estimated level smoothing parameter. */
  readonly alpha: number;
  /** Estimated trend smoothing parameter. */
  readonly beta: number;
  /** Damping slope φ (1.0 when not damped). */
  readonly phi: number;
  /** Initial level l₀. */
  readonly initialLevel: number;
  /** Initial trend b₀. */
  readonly initialTrend: number;
  /** In-sample one-step-ahead fitted values. */
  readonly fittedValues: readonly number[];
  /** In-sample residuals. */
  readonly residuals: readonly number[];
  /** Sum of squared errors. */
  readonly sse: number;
  /** Akaike Information Criterion. */
  readonly aic: number;
  /** Bayesian Information Criterion. */
  readonly bic: number;
  /** Corrected AIC. */
  readonly aicc: number;
}

// ── ExponentialSmoothing ─────────────────────────────────────────────────────

/** Options for {@link ExponentialSmoothing}. */
export interface ExponentialSmoothingOptions {
  /** Trend component. `"add"` = additive, `"mul"` = multiplicative, `null` = none. */
  readonly trend?: ETSTrend;
  /** Whether to use a damped trend. Default `false`. */
  readonly damped?: boolean;
  /** Seasonal component. `"add"` = additive, `"mul"` = multiplicative, `null` = none. */
  readonly seasonal?: ETSSeasonal;
  /** Number of periods in one seasonal cycle (e.g. 12 for monthly, 4 for quarterly). */
  readonly seasonalPeriods?: number;
  /** Smoothing level parameter (0 < α < 1). Auto-estimated if omitted. */
  readonly alpha?: number;
  /** Smoothing trend parameter (0 < β < 1). Auto-estimated if omitted. */
  readonly beta?: number;
  /** Smoothing seasonal parameter (0 < γ < 1). Auto-estimated if omitted. */
  readonly gamma?: number;
  /** Damping slope (0 < φ < 1). Auto-estimated when `damped = true` and omitted. */
  readonly phi?: number;
  /** How to initialise the state: `"heuristic"` (default) or `"known"`. */
  readonly initializationMethod?: ETSInit;
  /** Known initial level (only used when `initializationMethod = "known"`). */
  readonly initialLevel?: number;
  /** Known initial trend (only used when `initializationMethod = "known"`). */
  readonly initialTrend?: number;
  /** Known initial seasonal indices (only used when `initializationMethod = "known"`). */
  readonly initialSeasons?: readonly number[];
}

/** Result returned by {@link ExponentialSmoothing.fit}. */
export interface ExponentialSmoothingFitResult {
  /** Estimated level smoothing parameter. */
  readonly alpha: number;
  /** Estimated trend smoothing parameter (`null` when no trend component). */
  readonly beta: number | null;
  /** Estimated seasonal smoothing parameter (`null` when no seasonal component). */
  readonly gamma: number | null;
  /** Damping slope φ (1.0 when not damped). */
  readonly phi: number;
  /** Initial level l₀. */
  readonly initialLevel: number;
  /** Initial trend b₀ (`null` when no trend). */
  readonly initialTrend: number | null;
  /** Initial seasonal indices s₁…s_m (`null` when no seasonal). */
  readonly initialSeasons: readonly number[] | null;
  /** In-sample one-step-ahead fitted values. */
  readonly fittedValues: readonly number[];
  /** In-sample residuals. */
  readonly residuals: readonly number[];
  /** Sum of squared errors. */
  readonly sse: number;
  /** Log-likelihood. */
  readonly logLikelihood: number;
  /** Akaike Information Criterion. */
  readonly aic: number;
  /** Bayesian Information Criterion. */
  readonly bic: number;
  /** Corrected AIC. */
  readonly aicc: number;
}

/** Forecast result with prediction intervals. */
export interface ETSForecastResult {
  /** Point forecasts h = 1, 2, … steps. */
  readonly forecast: readonly number[];
  /** Lower bound of (1 − α_ci) % prediction interval. */
  readonly lower: readonly number[];
  /** Upper bound of (1 − α_ci) % prediction interval. */
  readonly upper: readonly number[];
  /** Standard errors of h-step-ahead forecast errors. */
  readonly stderr: readonly number[];
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Extract numeric array from Series or array. */
function toArr(y: readonly number[] | Series<number>): readonly number[] {
  if (Array.isArray(y)) return y;
  return y.values;
}

/** Clamp value to [lo, hi]. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** Clamp all elements of a param vector to their respective bounds. */
function clampParams(
  params: readonly number[],
  bounds: readonly [number, number][],
): number[] {
  return params.map((v, i) => clamp(v, (bounds[i] ?? [0, 1])[0], (bounds[i] ?? [0, 1])[1]));
}

/**
 * Nelder-Mead simplex optimiser (unconstrained; bounds enforced by clamping).
 * Minimises `fn(params)` starting from `x0`.
 */
function nelderMead(
  fn: (params: readonly number[]) => number,
  x0: readonly number[],
  bounds: readonly [number, number][],
  maxIter: number = 3000,
): { params: number[]; value: number } {
  const n = x0.length;
  if (n === 0) return { params: [], value: fn([]) };

  const EPS = 1e-12;
  const ALPHA_NM = 1.0; // reflection
  const BETA_NM = 0.5; // contraction
  const GAMMA_NM = 2.0; // expansion
  const SIGMA_NM = 0.5; // shrinkage

  const clamp1 = (p: readonly number[]): number[] => clampParams(p, bounds);

  // Build initial simplex
  const simplex: number[][] = [clamp1(x0)];
  for (let i = 0; i < n; i++) {
    const pt = clamp1(x0);
    const lo = (bounds[i] ?? [0, 1])[0];
    const hi = (bounds[i] ?? [0, 1])[1];
    const delta = Math.max((hi - lo) * 0.1, 0.01);
    pt[i] = clamp((pt[i] ?? 0) + delta, lo + EPS, hi - EPS);
    simplex.push(pt);
  }

  const fvals: number[] = simplex.map((p) => fn(p));

  for (let iter = 0; iter < maxIter; iter++) {
    // Sort indices by fval
    const ord = Array.from({ length: n + 1 }, (_, i) => i).sort(
      (a, b) => (fvals[a] ?? 0) - (fvals[b] ?? 0),
    );

    const fBest = fvals[ord[0] ?? 0] ?? 0;
    const fWorst = fvals[ord[n] ?? 0] ?? 0;
    if (fWorst - fBest < EPS) break;

    // Centroid of best n points
    const cent = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      const row = simplex[ord[i] ?? 0] ?? [];
      for (let j = 0; j < n; j++) cent[j] = (cent[j] ?? 0) + (row[j] ?? 0);
    }
    for (let j = 0; j < n; j++) cent[j] = (cent[j] ?? 0) / n;

    const worstPt = simplex[ord[n] ?? 0] ?? [];

    // Reflection
    const xr = clamp1(cent.map((c, j) => (1 + ALPHA_NM) * c - ALPHA_NM * (worstPt[j] ?? 0)));
    const fr = fn(xr);

    const fSecondWorst = fvals[ord[n - 1] ?? 0] ?? 0;

    if (fr < fBest) {
      // Expansion
      const xe = clamp1(cent.map((c, j) => (1 + GAMMA_NM) * c - GAMMA_NM * (worstPt[j] ?? 0)));
      const fe = fn(xe);
      if (fe < fr) {
        simplex[ord[n] ?? 0] = xe;
        fvals[ord[n] ?? 0] = fe;
      } else {
        simplex[ord[n] ?? 0] = xr;
        fvals[ord[n] ?? 0] = fr;
      }
    } else if (fr < fSecondWorst) {
      simplex[ord[n] ?? 0] = xr;
      fvals[ord[n] ?? 0] = fr;
    } else {
      // Contraction
      const inside = fr >= fWorst;
      const src = inside ? worstPt : xr;
      const xc = clamp1(cent.map((c, j) => BETA_NM * c + (1 - BETA_NM) * (src[j] ?? 0)));
      const fc = fn(xc);
      const compareVal = inside ? fWorst : fr;
      if (fc < compareVal) {
        simplex[ord[n] ?? 0] = xc;
        fvals[ord[n] ?? 0] = fc;
      } else {
        // Shrink
        const bestPt = simplex[ord[0] ?? 0] ?? [];
        for (let i = 1; i <= n; i++) {
          const row = simplex[ord[i] ?? 0] ?? [];
          const newRow = clamp1(row.map((v, j) => SIGMA_NM * (v + (bestPt[j] ?? 0))));
          simplex[ord[i] ?? 0] = newRow;
          fvals[ord[i] ?? 0] = fn(newRow);
        }
      }
    }
  }

  // Return best
  let bestIdx = 0;
  for (let i = 1; i <= n; i++) {
    if ((fvals[i] ?? Infinity) < (fvals[bestIdx] ?? Infinity)) bestIdx = i;
  }
  return { params: simplex[bestIdx] ?? [], value: fvals[bestIdx] ?? Infinity };
}

/** Compute AIC, BIC, AICc from SSE, n, k. */
function infoGaussian(
  sse: number,
  n: number,
  k: number,
): { logLikelihood: number; aic: number; bic: number; aicc: number } {
  const sigma2 = Math.max(sse / n, 1e-15);
  const logL = -0.5 * n * (Math.log(2 * Math.PI * sigma2) + 1);
  const aic = -2 * logL + 2 * k;
  const bic = -2 * logL + k * Math.log(n);
  const denom = n - k - 1;
  const aicc = denom > 0 ? aic + (2 * k * (k + 1)) / denom : aic;
  return { logLikelihood: logL, aic, bic, aicc };
}

// ─── SES internals ────────────────────────────────────────────────────────────

/**
 * Run one SES pass.  Returns { fitted, residuals, sse }.
 * l0 = initial level.
 */
function sesPass(
  y: readonly number[],
  alpha: number,
  l0: number,
): { fitted: number[]; residuals: number[]; sse: number } {
  const n = y.length;
  const fitted: number[] = new Array<number>(n);
  const residuals: number[] = new Array<number>(n);
  let sse = 0;
  let l = l0;
  for (let t = 0; t < n; t++) {
    fitted[t] = l;
    const e = (y[t] ?? 0) - l;
    residuals[t] = e;
    sse += e * e;
    l = alpha * (y[t] ?? 0) + (1 - alpha) * l;
  }
  return { fitted, residuals, sse };
}

// ─── Holt internals ───────────────────────────────────────────────────────────

/**
 * Run one Holt pass.
 * Returns { fitted, residuals, sse, levels, trends }.
 */
function holtPass(
  y: readonly number[],
  alpha: number,
  beta: number,
  phi: number,
  l0: number,
  b0: number,
): { fitted: number[]; residuals: number[]; sse: number } {
  const n = y.length;
  const fitted: number[] = new Array<number>(n);
  const residuals: number[] = new Array<number>(n);
  let sse = 0;
  let l = l0;
  let b = b0;
  for (let t = 0; t < n; t++) {
    const yhat = l + phi * b;
    fitted[t] = yhat;
    const yt = y[t] ?? 0;
    const e = yt - yhat;
    residuals[t] = e;
    sse += e * e;
    const lNew = alpha * yt + (1 - alpha) * (l + phi * b);
    b = beta * (lNew - l) + (1 - beta) * phi * b;
    l = lNew;
  }
  return { fitted, residuals, sse };
}

/** Holt h-step forecast (damped or not). */
function holtForecast(
  steps: number,
  l: number,
  b: number,
  phi: number,
): number[] {
  const out: number[] = [];
  let phiH = phi; // φ¹
  let phiSum = phi; // φ + φ² + … + φ^h
  for (let h = 1; h <= steps; h++) {
    out.push(l + phiSum * b);
    phiH *= phi;
    phiSum += phiH;
  }
  return out;
}

// ─── ETS (Holt-Winters) internals ─────────────────────────────────────────────

interface ETSState {
  l: number;
  b: number;
  s: number[]; // length m circular buffer, s[0] = s_{t-m+1}, … , s[m-1] = s_t
}

/**
 * Run one Holt-Winters pass.  Returns fitted values, residuals, SSE, and the
 * final state (l, b, last m seasonal indices).
 */
function hwPass(
  y: readonly number[],
  alpha: number,
  beta: number | null,
  gamma: number | null,
  phi: number,
  l0: number,
  b0: number | null,
  s0: readonly number[] | null,
  trend: ETSTrend,
  seasonal: ETSSeasonal,
  m: number,
): {
  fitted: number[];
  residuals: number[];
  sse: number;
  finalL: number;
  finalB: number;
  finalS: number[];
} {
  const n = y.length;
  const fitted: number[] = new Array<number>(n);
  const residuals: number[] = new Array<number>(n);
  let sse = 0;

  let l = l0;
  let b = b0 ?? 0;

  // seasonal buffer: seasonals[t % m] = s_{t+1-m}
  const seasonals: number[] = s0 ? s0.slice() : new Array<number>(m).fill(0);

  for (let t = 0; t < n; t++) {
    const yt = y[t] ?? 0;
    const sIdx = ((t % m) + m) % m; // index into seasonal buffer
    const st_m = seasonals[sIdx] ?? 0; // s_{t+1-m}

    // One-step-ahead forecast
    let yhat: number;
    if (trend === null && seasonal === null) {
      yhat = l;
    } else if (trend !== null && seasonal === null) {
      yhat = l + phi * b;
    } else if (trend === null && seasonal === "add") {
      yhat = l + st_m;
    } else if (trend === null && seasonal === "mul") {
      yhat = l * st_m;
    } else if (trend === "add" && seasonal === "add") {
      yhat = l + phi * b + st_m;
    } else if (trend === "add" && seasonal === "mul") {
      yhat = (l + phi * b) * st_m;
    } else if (trend === "mul" && seasonal === "add") {
      yhat = l * (phi === 1 ? b : Math.pow(b, phi)) + st_m;
    } else {
      // mul trend + mul seasonal
      yhat = l * (phi === 1 ? b : Math.pow(b, phi)) * st_m;
    }

    fitted[t] = yhat;
    const e = yt - yhat;
    residuals[t] = e;
    sse += e * e;

    // State update
    const lPrev = l;
    const bPrev = b;

    if (trend === null && seasonal === null) {
      l = alpha * yt + (1 - alpha) * l;
    } else if (trend !== null && seasonal === null) {
      l = alpha * yt + (1 - alpha) * (l + phi * b);
      if (beta !== null) b = beta * (l - lPrev) + (1 - beta) * phi * bPrev;
    } else if (trend === null && seasonal === "add") {
      l = alpha * (yt - st_m) + (1 - alpha) * l;
      if (gamma !== null) seasonals[sIdx] = gamma * (yt - l) + (1 - gamma) * st_m;
    } else if (trend === null && seasonal === "mul") {
      l = alpha * (st_m !== 0 ? yt / st_m : yt) + (1 - alpha) * l;
      if (gamma !== null) seasonals[sIdx] = gamma * (l !== 0 ? yt / l : 1) + (1 - gamma) * st_m;
    } else if (trend === "add" && seasonal === "add") {
      l = alpha * (yt - st_m) + (1 - alpha) * (lPrev + phi * bPrev);
      if (beta !== null) b = beta * (l - lPrev) + (1 - beta) * phi * bPrev;
      if (gamma !== null) seasonals[sIdx] = gamma * (yt - l) + (1 - gamma) * st_m;
    } else if (trend === "add" && seasonal === "mul") {
      l =
        alpha * (st_m !== 0 ? yt / st_m : yt) + (1 - alpha) * (lPrev + phi * bPrev);
      if (beta !== null) b = beta * (l - lPrev) + (1 - beta) * phi * bPrev;
      if (gamma !== null)
        seasonals[sIdx] =
          gamma * (l + phi * b !== 0 ? yt / (l + phi * b) : 1) + (1 - gamma) * st_m;
    } else {
      // multiplicative trend — approximate as additive for stability
      l = alpha * yt + (1 - alpha) * (lPrev + phi * bPrev);
      if (beta !== null) b = beta * (l - lPrev) + (1 - beta) * phi * bPrev;
      if (gamma !== null) seasonals[sIdx] = gamma * (yt - l) + (1 - gamma) * st_m;
    }
  }

  return {
    fitted,
    residuals,
    sse,
    finalL: l,
    finalB: b,
    finalS: seasonals.slice(),
  };
}

/**
 * Generate h-step forecasts from the final ETS state.
 * `finalS` is the circular buffer of the last m seasonal indices where
 * `finalS[t % m]` = s_{t+1-m} (same convention as hwPass).
 */
function hwForecast(
  steps: number,
  l: number,
  b: number,
  finalS: readonly number[],
  phi: number,
  trend: ETSTrend,
  seasonal: ETSSeasonal,
  m: number,
  n: number, // length of training series (to compute season offsets)
): number[] {
  const out: number[] = [];
  let phiH = phi;
  let phiSum = phi;

  // At t = n-1 (last training obs), seasonals[t % m] has just been updated.
  // For forecast step h, the seasonal index corresponds to position (n-1+h) % m in
  // the buffer (shifted by 1 because sIdx = (t % m) in hwPass at time t = n-1+h).
  for (let h = 1; h <= steps; h++) {
    const sIdx = ((n - 1 + h) % m + m) % m;
    const sVal = finalS[sIdx] ?? 1;

    let yhat: number;
    if (trend === null && seasonal === null) {
      yhat = l;
    } else if (trend !== null && seasonal === null) {
      yhat = l + phiSum * b;
    } else if (trend === null && seasonal === "add") {
      yhat = l + sVal;
    } else if (trend === null && seasonal === "mul") {
      yhat = l * sVal;
    } else if (trend === "add" && seasonal === "add") {
      yhat = l + phiSum * b + sVal;
    } else if (trend === "add" && seasonal === "mul") {
      yhat = (l + phiSum * b) * sVal;
    } else if (trend === "mul" && seasonal === "add") {
      yhat = l * Math.pow(b, phiSum) + sVal;
    } else {
      yhat = l * Math.pow(b, phiSum) * sVal;
    }

    out.push(yhat);

    phiH *= phi;
    phiSum += phiH;
  }
  return out;
}

// ─── Heuristic initialisation ─────────────────────────────────────────────────

/**
 * Compute heuristic initial level and trend.
 * Uses mean of first season + linear regression slope on first two seasons.
 */
function heuristicInit(
  y: readonly number[],
  m: number,
  hasTrend: boolean,
): { l0: number; b0: number } {
  const n = y.length;
  if (!hasTrend) {
    return { l0: y[0] ?? 0, b0: 0 };
  }
  // Use first season average as l0, slope between first two seasons as b0
  const k = Math.min(m, n);
  let s1 = 0;
  for (let i = 0; i < k; i++) s1 += y[i] ?? 0;
  const l0 = s1 / k;

  if (n >= 2 * m) {
    let s2 = 0;
    for (let i = m; i < 2 * m; i++) s2 += y[i] ?? 0;
    const b0 = (s2 / m - l0) / m;
    return { l0, b0: b0 || (((y[1] ?? 0) - (y[0] ?? 0)) * m) / m };
  }
  // Fallback: slope between y[0] and y[n-1]
  const b0 = n > 1 ? ((y[n - 1] ?? 0) - (y[0] ?? 0)) / (n - 1) : 0;
  return { l0, b0 };
}

/**
 * Compute heuristic seasonal indices.
 * Additive: s_j = avg(y_j, y_{j+m}, …) − overall mean
 * Multiplicative: s_j = avg(y_j, y_{j+m}, …) / overall mean
 */
function heuristicSeasons(
  y: readonly number[],
  m: number,
  seasonal: "add" | "mul",
  l0: number,
  b0: number,
): number[] {
  const n = y.length;
  const cycles = Math.max(1, Math.floor(n / m));

  // Detrended values for each position in the seasonal cycle
  const byPos: number[][] = Array.from({ length: m }, () => []);
  for (let t = 0; t < cycles * m && t < n; t++) {
    const trend = l0 + b0 * t;
    const raw = y[t] ?? 0;
    const pos = t % m;
    const posArr = byPos[pos];
    if (posArr !== undefined) {
      if (seasonal === "add") {
        posArr.push(raw - trend);
      } else {
        posArr.push(trend !== 0 ? raw / trend : 1);
      }
    }
  }

  const rawS = byPos.map((vals) => {
    if (vals.length === 0) return seasonal === "add" ? 0 : 1;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  // Normalise so seasonal indices sum to 0 (additive) or m (multiplicative)
  if (seasonal === "add") {
    const mean = rawS.reduce((a, b) => a + b, 0) / m;
    return rawS.map((v) => v - mean);
  } else {
    const mean = rawS.reduce((a, b) => a + b, 0) / m;
    return rawS.map((v) => (mean !== 0 ? (v / mean) * 1 : 1));
  }
}

// ─── SimpleExpSmoothing ──────────────────────────────────────────────────────

/**
 * Simple Exponential Smoothing (SES / ETS(A,N,N)).
 *
 * Produces level-only forecasts; all future forecasts equal the final level.
 *
 * @example
 * ```ts
 * import { SimpleExpSmoothing } from "tsb";
 * const model = new SimpleExpSmoothing();
 * const fit = model.fit([3, 5, 4, 6, 5, 8, 7]);
 * console.log(fit.alpha, fit.sse);
 * console.log(model.forecast(3)); // [level, level, level]
 * ```
 */
export class SimpleExpSmoothing {
  private _fit: SESFitResult | null = null;
  private _finalLevel: number = 0;

  /**
   * Fit the SES model to observed data.
   * @param y - Time series observations.
   * @param opts - Optional fixed parameters.
   */
  fit(y: readonly number[] | Series<number>, opts?: SESOptions): SESFitResult {
    const arr = toArr(y);
    const n = arr.length;
    if (n < 2) throw new RangeError("SimpleExpSmoothing requires at least 2 observations");

    const l0Init = opts?.initialLevel ?? (arr[0] ?? 0);

    let alpha: number;
    let l0: number;

    if (opts?.alpha !== undefined) {
      alpha = clamp(opts.alpha, 1e-6, 1 - 1e-6);
      l0 = l0Init;
    } else {
      // Optimise α (and optionally l0)
      const result = nelderMead(
        ([a, l]: readonly number[]) => sesPass(arr, a ?? 0.3, l ?? (arr[0] ?? 0)).sse,
        [0.3, l0Init],
        [
          [1e-6, 1 - 1e-6],
          [(arr[0] ?? 0) - Math.abs(arr[0] ?? 0) * 5 - 1, (arr[0] ?? 0) + Math.abs(arr[0] ?? 0) * 5 + 1],
        ],
      );
      alpha = result.params[0] ?? 0.3;
      l0 = result.params[1] ?? l0Init;
    }

    const { fitted, residuals, sse } = sesPass(arr, alpha, l0);

    // Final level for forecasting
    let lFinal = l0;
    for (const yt of arr) lFinal = alpha * yt + (1 - alpha) * lFinal;
    this._finalLevel = lFinal;

    const k = 2; // alpha + l0
    const { aic, bic, aicc } = infoGaussian(sse, n, k);

    const result: SESFitResult = {
      alpha,
      initialLevel: l0,
      fittedValues: fitted,
      residuals,
      sse,
      aic,
      bic,
      aicc,
    };
    this._fit = result;
    return result;
  }

  /**
   * Generate `steps` forecasts from the last fitted state.
   * All forecasts equal the final level (flat forecast).
   * Must call {@link fit} first.
   */
  forecast(steps: number): number[] {
    if (this._fit === null) throw new Error("Call fit() before forecast()");
    return new Array<number>(steps).fill(this._finalLevel);
  }
}

// ─── Holt ─────────────────────────────────────────────────────────────────────

/**
 * Holt's linear (double) exponential smoothing (ETS(A,A,N) / ETS(A,Ad,N)).
 *
 * Extends SES with a trend component; supports optional damping.
 *
 * @example
 * ```ts
 * import { Holt } from "tsb";
 * const model = new Holt();
 * const fit = model.fit([3, 5, 4, 6, 5, 8, 7, 9, 8, 11]);
 * console.log(fit.alpha, fit.beta, fit.phi);
 * console.log(model.forecast(5));
 * ```
 */
export class Holt {
  private _opts: HoltOptions = {};
  private _fit: HoltFitResult | null = null;
  private _finalL: number = 0;
  private _finalB: number = 0;
  private _phi: number = 1;

  constructor(opts?: HoltOptions) {
    this._opts = opts ?? {};
  }

  /**
   * Fit Holt's model to observed data.
   * @param y - Time series observations.
   * @param opts - Optional parameter overrides (merged with constructor opts).
   */
  fit(y: readonly number[] | Series<number>, opts?: HoltOptions): HoltFitResult {
    const arr = toArr(y);
    const n = arr.length;
    if (n < 3) throw new RangeError("Holt requires at least 3 observations");

    const merged: HoltOptions = { ...this._opts, ...opts };
    const damped = merged.damped ?? false;

    const { l0: l0h, b0: b0h } = heuristicInit(arr, n, true);

    const alphaFixed = merged.alpha;
    const betaFixed = merged.beta;
    const phiFixed = merged.dampingSlope;
    const l0Fixed = merged.initialLevel ?? l0h;
    const b0Fixed = merged.initialTrend ?? b0h;

    // Build optimisation bounds and initial point
    type Bound = [number, number];
    const paramNames: string[] = [];
    const x0: number[] = [];
    const bounds: Bound[] = [];

    if (alphaFixed === undefined) {
      paramNames.push("alpha");
      x0.push(0.3);
      bounds.push([1e-6, 1 - 1e-6]);
    }
    if (betaFixed === undefined) {
      paramNames.push("beta");
      x0.push(0.1);
      bounds.push([1e-6, 1 - 1e-6]);
    }
    if (damped && phiFixed === undefined) {
      paramNames.push("phi");
      x0.push(0.98);
      bounds.push([0.8, 1 - 1e-6]);
    }
    // Always optimise l0 and b0 if not fixed
    const optimL0 = merged.initialLevel === undefined;
    const optimB0 = merged.initialTrend === undefined;
    if (optimL0) {
      paramNames.push("l0");
      x0.push(l0h);
      const spread = Math.abs(l0h) * 2 + 10;
      bounds.push([l0h - spread, l0h + spread]);
    }
    if (optimB0) {
      paramNames.push("b0");
      x0.push(b0h);
      const spread = Math.abs(b0h) * 5 + 1;
      bounds.push([b0h - spread, b0h + spread]);
    }

    let alpha = alphaFixed ?? 0.3;
    let beta = betaFixed ?? 0.1;
    let phi = damped ? (phiFixed ?? 0.98) : 1.0;
    let l0 = l0Fixed;
    let b0 = b0Fixed;

    if (x0.length > 0) {
      const result = nelderMead(
        (params: readonly number[]): number => {
          let a = alphaFixed ?? (params[paramNames.indexOf("alpha")] ?? 0.3);
          let bta = betaFixed ?? (params[paramNames.indexOf("beta")] ?? 0.1);
          let ph = damped ? (phiFixed ?? (params[paramNames.indexOf("phi")] ?? 0.98)) : 1.0;
          let ll0 = optimL0 ? (params[paramNames.indexOf("l0")] ?? l0h) : l0Fixed;
          let lb0 = optimB0 ? (params[paramNames.indexOf("b0")] ?? b0h) : b0Fixed;
          a = clamp(a, 1e-6, 1 - 1e-6);
          bta = clamp(bta, 1e-6, 1 - 1e-6);
          ph = clamp(ph, 0.8, 1 - 1e-6);
          return holtPass(arr, a, bta, ph, ll0, lb0).sse;
        },
        x0,
        bounds,
      );
      const p = result.params;
      alpha = alphaFixed ?? (p[paramNames.indexOf("alpha")] ?? alpha);
      beta = betaFixed ?? (p[paramNames.indexOf("beta")] ?? beta);
      phi = damped ? (phiFixed ?? (p[paramNames.indexOf("phi")] ?? phi)) : 1.0;
      l0 = optimL0 ? (p[paramNames.indexOf("l0")] ?? l0) : l0Fixed;
      b0 = optimB0 ? (p[paramNames.indexOf("b0")] ?? b0) : b0Fixed;
    }

    alpha = clamp(alpha, 1e-6, 1 - 1e-6);
    beta = clamp(beta, 1e-6, 1 - 1e-6);
    if (damped) phi = clamp(phi, 0.8, 1 - 1e-6);

    const { fitted, residuals, sse } = holtPass(arr, alpha, beta, phi, l0, b0);

    // Final state for forecasting
    let lF = l0;
    let bF = b0;
    for (const yt of arr) {
      const lNew = alpha * yt + (1 - alpha) * (lF + phi * bF);
      bF = beta * (lNew - lF) + (1 - beta) * phi * bF;
      lF = lNew;
    }
    this._finalL = lF;
    this._finalB = bF;
    this._phi = phi;

    const k = 2 + (damped ? 1 : 0) + 2; // alpha + beta + phi? + l0 + b0
    const { aic, bic, aicc } = infoGaussian(sse, n, k);

    const result: HoltFitResult = {
      alpha,
      beta,
      phi,
      initialLevel: l0,
      initialTrend: b0,
      fittedValues: fitted,
      residuals,
      sse,
      aic,
      bic,
      aicc,
    };
    this._fit = result;
    return result;
  }

  /**
   * Generate `steps` forecasts from the last fitted state.
   * Must call {@link fit} first.
   */
  forecast(steps: number): number[] {
    if (this._fit === null) throw new Error("Call fit() before forecast()");
    return holtForecast(steps, this._finalL, this._finalB, this._phi);
  }
}

// ─── ExponentialSmoothing (Holt-Winters) ─────────────────────────────────────

/**
 * Holt-Winters Exponential Smoothing — full ETS model.
 *
 * Supports all combinations of additive / multiplicative trend and seasonal
 * components with optional damped trend.
 *
 * @example
 * ```ts
 * import { ExponentialSmoothing } from "tsb";
 *
 * // Monthly data with additive seasonal component
 * const y = [17, 21, 23, 18, 22, 26, 19, 24, 27, 20, 25, 28,
 *            18, 23, 25, 20, 24, 28, 21, 26, 29, 22, 27, 30];
 * const model = new ExponentialSmoothing({ trend: "add", seasonal: "add", seasonalPeriods: 12 });
 * const fit = model.fit(y);
 * console.log(fit.alpha, fit.beta, fit.gamma, fit.aic);
 * console.log(model.forecast(12));
 * ```
 */
export class ExponentialSmoothing {
  private _opts: ExponentialSmoothingOptions;
  private _fit: ExponentialSmoothingFitResult | null = null;
  private _finalL: number = 0;
  private _finalB: number = 0;
  private _finalS: number[] = [];
  private _phi: number = 1;
  private _trend: ETSTrend = null;
  private _seasonal: ETSSeasonal = null;
  private _m: number = 1;
  private _n: number = 0;
  private _sigma2: number = 1;

  constructor(opts?: ExponentialSmoothingOptions) {
    this._opts = opts ?? {};
  }

  /**
   * Fit the Holt-Winters model to observed data.
   * @param y - Time series observations.
   * @param opts - Optional parameter overrides.
   */
  fit(
    y: readonly number[] | Series<number>,
    opts?: ExponentialSmoothingOptions,
  ): ExponentialSmoothingFitResult {
    const arr = toArr(y);
    const n = arr.length;
    if (n < 3) throw new RangeError("ExponentialSmoothing requires at least 3 observations");

    const merged: ExponentialSmoothingOptions = { ...this._opts, ...opts };
    const trend = merged.trend ?? null;
    const seasonal = merged.seasonal ?? null;
    const damped = merged.damped ?? false;
    const m = merged.seasonalPeriods ?? (seasonal !== null ? 2 : 1);

    this._trend = trend;
    this._seasonal = seasonal;
    this._m = m;
    this._n = n;

    if (seasonal !== null && n < 2 * m) {
      throw new RangeError(
        `ExponentialSmoothing: need at least 2 full seasonal periods (${2 * m} obs), got ${n}`,
      );
    }

    const initMethod = merged.initializationMethod ?? "heuristic";

    // Heuristic initialisation
    const { l0: l0h, b0: b0h } = heuristicInit(arr, m, trend !== null);
    const s0h =
      seasonal !== null ? heuristicSeasons(arr, m, seasonal, l0h, b0h) : null;

    // Determine which params to optimise
    const alphaFixed = merged.alpha;
    const betaFixed = merged.beta;
    const gammaFixed = merged.gamma;
    const phiFixed = merged.phi;
    const l0Fixed =
      initMethod === "known"
        ? (merged.initialLevel ?? l0h)
        : undefined;
    const b0Fixed =
      initMethod === "known"
        ? (merged.initialTrend ?? b0h)
        : undefined;
    const s0Fixed =
      initMethod === "known" && merged.initialSeasons !== undefined
        ? merged.initialSeasons.slice()
        : undefined;

    type Bound = [number, number];
    const paramNames: string[] = [];
    const x0: number[] = [];
    const bounds: Bound[] = [];

    if (alphaFixed === undefined) {
      paramNames.push("alpha");
      x0.push(0.3);
      bounds.push([1e-6, 1 - 1e-6]);
    }
    if (trend !== null && betaFixed === undefined) {
      paramNames.push("beta");
      x0.push(0.1);
      bounds.push([1e-6, 1 - 1e-6]);
    }
    if (seasonal !== null && gammaFixed === undefined) {
      paramNames.push("gamma");
      x0.push(0.1);
      bounds.push([1e-6, 1 - 1e-6]);
    }
    if (damped && phiFixed === undefined) {
      paramNames.push("phi");
      x0.push(0.98);
      bounds.push([0.8, 1 - 1e-6]);
    }

    const optimL0 = initMethod !== "known" && merged.initialLevel === undefined;
    const optimB0 = trend !== null && initMethod !== "known" && merged.initialTrend === undefined;
    const optimS0 = seasonal !== null && initMethod !== "known" && merged.initialSeasons === undefined;

    if (optimL0) {
      paramNames.push("l0");
      x0.push(l0h);
      const sp = Math.abs(l0h) * 2 + 10;
      bounds.push([l0h - sp, l0h + sp]);
    }
    if (optimB0) {
      paramNames.push("b0");
      x0.push(b0h);
      const sp = Math.abs(b0h) * 5 + 1;
      bounds.push([b0h - sp, b0h + sp]);
    }
    if (optimS0 && s0h !== null) {
      for (let j = 0; j < m; j++) {
        paramNames.push(`s0_${j}`);
        x0.push(s0h[j] ?? 0);
        const sp = Math.abs(s0h[j] ?? 0) * 5 + 1;
        bounds.push([(s0h[j] ?? 0) - sp, (s0h[j] ?? 0) + sp]);
      }
    }

    let alpha = alphaFixed ?? 0.3;
    let beta = trend !== null ? (betaFixed ?? 0.1) : null;
    let gamma = seasonal !== null ? (gammaFixed ?? 0.1) : null;
    let phi = damped ? (phiFixed ?? 0.98) : 1.0;
    let l0 = l0Fixed ?? l0h;
    let b0 = b0Fixed ?? b0h;
    let s0 = s0Fixed ?? s0h;

    if (x0.length > 0) {
      const res = nelderMead(
        (params: readonly number[]): number => {
          let a = alphaFixed ?? (params[paramNames.indexOf("alpha")] ?? 0.3);
          let bt = trend !== null ? (betaFixed ?? (params[paramNames.indexOf("beta")] ?? 0.1)) : null;
          let gm = seasonal !== null ? (gammaFixed ?? (params[paramNames.indexOf("gamma")] ?? 0.1)) : null;
          let ph = damped ? (phiFixed ?? (params[paramNames.indexOf("phi")] ?? 0.98)) : 1.0;
          a = clamp(a, 1e-6, 1 - 1e-6);
          if (bt !== null) bt = clamp(bt, 1e-6, 1 - 1e-6);
          if (gm !== null) gm = clamp(gm, 1e-6, 1 - 1e-6);
          if (damped) ph = clamp(ph, 0.8, 1 - 1e-6);

          let ll0 = optimL0 ? (params[paramNames.indexOf("l0")] ?? l0h) : (l0Fixed ?? l0h);
          let lb0 = optimB0 ? (params[paramNames.indexOf("b0")] ?? b0h) : (b0Fixed ?? b0h);
          let ss0: number[] | null = null;
          if (optimS0) {
            ss0 = [];
            for (let j = 0; j < m; j++) {
              ss0.push(params[paramNames.indexOf(`s0_${j}`)] ?? (s0h?.[j] ?? 0));
            }
          } else {
            ss0 = s0Fixed ?? s0h;
          }

          return hwPass(arr, a, bt, gm, ph, ll0, lb0, ss0, trend, seasonal, m).sse;
        },
        x0,
        bounds,
        seasonal !== null ? 5000 : 3000,
      );
      const p = res.params;
      alpha = alphaFixed ?? (p[paramNames.indexOf("alpha")] ?? alpha);
      beta = trend !== null ? (betaFixed ?? (p[paramNames.indexOf("beta")] ?? (beta ?? 0.1))) : null;
      gamma = seasonal !== null ? (gammaFixed ?? (p[paramNames.indexOf("gamma")] ?? (gamma ?? 0.1))) : null;
      phi = damped ? (phiFixed ?? (p[paramNames.indexOf("phi")] ?? phi)) : 1.0;
      l0 = optimL0 ? (p[paramNames.indexOf("l0")] ?? l0) : (l0Fixed ?? l0);
      b0 = optimB0 ? (p[paramNames.indexOf("b0")] ?? b0) : (b0Fixed ?? b0);
      if (optimS0) {
        s0 = [];
        for (let j = 0; j < m; j++) s0.push(p[paramNames.indexOf(`s0_${j}`)] ?? (s0h?.[j] ?? 0));
      }
    }

    // Final clamp
    alpha = clamp(alpha, 1e-6, 1 - 1e-6);
    if (beta !== null) beta = clamp(beta, 1e-6, 1 - 1e-6);
    if (gamma !== null) gamma = clamp(gamma, 1e-6, 1 - 1e-6);
    if (damped) phi = clamp(phi, 0.8, 1 - 1e-6);

    const { fitted, residuals, sse, finalL, finalB, finalS } = hwPass(
      arr,
      alpha,
      beta,
      gamma,
      phi,
      l0,
      b0,
      s0,
      trend,
      seasonal,
      m,
    );

    this._finalL = finalL;
    this._finalB = finalB;
    this._finalS = finalS;
    this._phi = phi;
    this._sigma2 = Math.max(sse / n, 1e-15);

    // Number of free parameters for information criteria
    const nParams =
      1 + // alpha
      (trend !== null ? 1 : 0) + // beta
      (seasonal !== null ? 1 : 0) + // gamma
      (damped ? 1 : 0) + // phi
      1 + // l0
      (trend !== null ? 1 : 0) + // b0
      (seasonal !== null ? m : 0); // seasonal indices

    const { logLikelihood, aic, bic, aicc } = infoGaussian(sse, n, nParams);

    const result: ExponentialSmoothingFitResult = {
      alpha,
      beta,
      gamma,
      phi,
      initialLevel: l0,
      initialTrend: trend !== null ? b0 : null,
      initialSeasons: seasonal !== null ? (s0 ?? null) : null,
      fittedValues: fitted,
      residuals,
      sse,
      logLikelihood,
      aic,
      bic,
      aicc,
    };
    this._fit = result;
    return result;
  }

  /**
   * Generate `steps` point forecasts from the final state.
   * Must call {@link fit} first.
   */
  forecast(steps: number): number[] {
    if (this._fit === null) throw new Error("Call fit() before forecast()");
    return hwForecast(
      steps,
      this._finalL,
      this._finalB,
      this._finalS,
      this._phi,
      this._trend,
      this._seasonal,
      this._m,
      this._n,
    );
  }

  /**
   * Generate `steps` forecasts with (1 − `alpha_ci`) prediction intervals.
   * Uses additive-error variance approximation (constant σ² scaled by h).
   * Must call {@link fit} first.
   *
   * @param steps - Number of steps ahead.
   * @param alpha_ci - Significance level (default 0.05 → 95 % intervals).
   */
  forecastWithCI(steps: number, alpha_ci: number = 0.05): ETSForecastResult {
    const fc = this.forecast(steps);
    // Normal quantile for (1 - alpha_ci/2)
    const z = normalQuantile(1 - alpha_ci / 2);
    const sigma = Math.sqrt(this._sigma2);
    const lower: number[] = [];
    const upper: number[] = [];
    const stderr: number[] = [];
    for (let h = 1; h <= steps; h++) {
      // Variance grows linearly with h for additive-error models
      const se = sigma * Math.sqrt(h);
      stderr.push(se);
      lower.push((fc[h - 1] ?? 0) - z * se);
      upper.push((fc[h - 1] ?? 0) + z * se);
    }
    return { forecast: fc, lower, upper, stderr };
  }
}

/**
 * Rational approximation of the normal quantile function (Abramowitz & Stegun).
 * @internal
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
  const num = (a[0] ?? 0) + (a[1] ?? 0) * t + (a[2] ?? 0) * t * t;
  const den = 1 + (b[0] ?? 0) * t + (b[1] ?? 0) * t * t + (b[2] ?? 0) * t * t * t;
  const x = t - num / den;
  return p < 0.5 ? -x : x;
}

// ─── Convenience functions ────────────────────────────────────────────────────

/**
 * Fit a Simple Exponential Smoothing model and return the result.
 *
 * @example
 * ```ts
 * import { simpleExpSmoothing } from "tsb";
 * const { alpha, fittedValues, sse } = simpleExpSmoothing([3, 5, 4, 6, 5]);
 * ```
 */
export function simpleExpSmoothing(
  y: readonly number[] | Series<number>,
  opts?: SESOptions,
): SESFitResult {
  return new SimpleExpSmoothing().fit(y, opts);
}

/**
 * Fit a Holt linear trend model and return the result.
 *
 * @example
 * ```ts
 * import { holt } from "tsb";
 * const fit = holt([3, 5, 4, 6, 5, 8, 7, 9]);
 * console.log(fit.alpha, fit.beta, fit.sse);
 * ```
 */
export function holt(
  y: readonly number[] | Series<number>,
  opts?: HoltOptions,
): HoltFitResult {
  return new Holt(opts).fit(y);
}

/**
 * Fit a full Holt-Winters Exponential Smoothing model and return the result.
 *
 * @example
 * ```ts
 * import { fitEts } from "tsb";
 * const y = [17, 21, 23, 18, 22, 26, 19, 24, 27, 20, 25, 28];
 * const fit = fitEts(y, { trend: "add", seasonal: "add", seasonalPeriods: 4 });
 * console.log(fit.alpha, fit.beta, fit.gamma, fit.aic);
 * ```
 */
export function fitEts(
  y: readonly number[] | Series<number>,
  opts?: ExponentialSmoothingOptions,
): ExponentialSmoothingFitResult {
  return new ExponentialSmoothing(opts).fit(y);
}
