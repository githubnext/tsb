/**
 * arima — ARIMA(p, d, q) time-series model.
 *
 * Mirrors the `statsmodels.tsa.arima.model.ARIMA` API and pandas convention.
 * Estimation uses the Hannan-Rissanen two-step method:
 *   1. Fit a high-order AR(kMax) via Yule-Walker to obtain proxy residuals.
 *   2. OLS on the differenced series using AR(p) lags + MA(q) proxy residuals.
 *
 * kMax = min(max(p + q + 5, 3), floor(n / 5)).
 *
 * Forecast confidence intervals use ψ-weight recursion. For integrated models
 * (d > 0) the ψ-weights are accumulated d times (convolution with integration
 * filter) before computing the forecast MSE.
 *
 * @example
 * ```ts
 * import { ARIMAModel } from "tsb";
 *
 * const y = [1, 2, 1.5, 2.5, 2, 3, 2.5, 3.5, 3, 4, 3.5, 4.5, 4];
 * const model = new ARIMAModel({ p: 1, d: 0, q: 1 });
 * const fit = model.fit(y);
 * console.log(fit.arCoeffs, fit.maCoeffs, fit.aic);
 * const fc = model.forecast(5);
 * console.log(fc.forecast, fc.lower, fc.upper);
 * ```
 *
 * @module
 */

import type { Series } from "../core/series.ts";

// ─── Public types ──────────────────────────────────────────────────────────────

/** Constructor options for {@link ARIMAModel}. */
export interface ARIMAOptions {
  /** AR order (number of autoregressive lags). Default: 1. */
  readonly p?: number;
  /** Differencing order. Default: 0. */
  readonly d?: number;
  /** MA order (number of moving-average lags). Default: 0. */
  readonly q?: number;
}

/** Results returned by {@link ARIMAModel.fit}. */
export interface ARIMAFitResult {
  /** AR coefficients φ₁ … φₚ (index 0 = lag 1). */
  readonly arCoeffs: readonly number[];
  /** MA coefficients θ₁ … θ_q (index 0 = lag 1). */
  readonly maCoeffs: readonly number[];
  /** Intercept / constant term on the differenced scale. */
  readonly intercept: number;
  /** In-sample fitted values on the **original** (undifferenced) scale. */
  readonly fittedValues: readonly number[];
  /** Residuals on the differenced scale. */
  readonly residuals: readonly number[];
  /** Estimated noise variance σ². */
  readonly sigma2: number;
  /** Log-likelihood (Gaussian). */
  readonly logLikelihood: number;
  /** Akaike Information Criterion. */
  readonly aic: number;
  /** Bayesian Information Criterion. */
  readonly bic: number;
}

/** Multi-step forecasts with prediction intervals from {@link ARIMAModel.forecast}. */
export interface ARIMAForecastResult {
  /** Point forecasts on the original (undifferenced) scale. */
  readonly forecast: readonly number[];
  /** Lower bound of the 95 % prediction interval (original scale). */
  readonly lower: readonly number[];
  /** Upper bound of the 95 % prediction interval (original scale). */
  readonly upper: readonly number[];
  /** Standard errors of the h-step-ahead forecast errors. */
  readonly stderr: readonly number[];
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Type guard: distinguishes `readonly number[]` from `Series<number>`. */
function isNumericArray(y: readonly number[] | Series<number>): y is readonly number[] {
  return Array.isArray(y);
}

function arrMean(x: readonly number[]): number {
  if (x.length === 0) return 0;
  let s = 0;
  for (const v of x) s += v;
  return s / x.length;
}

/** Apply d-th order differencing; also collects the d initial values needed to
 *  reverse the operation. */
function difference(
  y: readonly number[],
  d: number,
): { w: number[]; inits: number[] } {
  const inits: number[] = [];
  let w: number[] = y.slice();
  for (let i = 0; i < d; i++) {
    inits.push(w[0] ?? 0);
    const dw = new Array<number>(w.length - 1);
    for (let t = 1; t < w.length; t++) dw[t - 1] = (w[t] ?? 0) - (w[t - 1] ?? 0);
    w = dw;
  }
  return { w, inits };
}

/** Reverse d levels of differencing, using the stored initial values. */
function undifference(
  dw: readonly number[],
  inits: readonly number[],
  d: number,
): number[] {
  let w: number[] = dw.slice();
  for (let i = d - 1; i >= 0; i--) {
    const init = inits[i] ?? 0;
    const un = new Array<number>(w.length + 1);
    un[0] = init;
    for (let t = 0; t < w.length; t++) un[t + 1] = (un[t] ?? 0) + (w[t] ?? 0);
    w = un;
  }
  return w;
}

/** Estimate AR(k) coefficients via Yule-Walker / Levinson-Durbin.
 *  Returns { ar: coefficients, sigma2: innovation variance }. */
function yuleWalkerAR(
  x: readonly number[],
  k: number,
): { ar: readonly number[]; sigma2: number } {
  if (k === 0) {
    const mu = arrMean(x);
    let s = 0;
    for (const v of x) s += (v - mu) ** 2;
    return { ar: [], sigma2: s / x.length || 1 };
  }
  const n = x.length;
  const mu = arrMean(x);

  // Autocovariances γ(0)…γ(k)
  const acov = new Array<number>(k + 1).fill(0);
  for (let h = 0; h <= k; h++) {
    let s = 0;
    for (let t = h; t < n; t++) s += ((x[t] ?? 0) - mu) * ((x[t - h] ?? 0) - mu);
    acov[h] = s / n;
  }

  // Levinson-Durbin recursion
  let prevA: number[] = [];
  let P = acov[0] || 1e-15;

  for (let m = 1; m <= k; m++) {
    // Reflection coefficient
    let num = acov[m] ?? 0;
    for (let j = 1; j < m; j++) num -= (prevA[j - 1] ?? 0) * (acov[m - j] ?? 0);
    const km = P > 0 ? num / P : 0;

    // Update AR coefficients
    const curA = new Array<number>(m);
    for (let j = 1; j < m; j++) {
      curA[j - 1] = (prevA[j - 1] ?? 0) - km * (prevA[m - j - 1] ?? 0);
    }
    curA[m - 1] = km;
    P = P * (1 - km * km);
    prevA = curA;
  }

  return { ar: prevA, sigma2: Math.max(P, 1e-15) };
}

/** Solve β = (X'X)⁻¹ X'y via Gaussian elimination with partial pivoting.
 *  X is (n × k), y is (n). Returns length-k coefficient vector. */
function olsSolve(X: readonly (readonly number[])[], y: readonly number[]): number[] {
  const n = X.length;
  const k = (X[0] ?? []).length;
  // Build augmented matrix [X'X | X'y] of size k × (k+1)
  const A: number[][] = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let t = 0; t < n; t++) s += ((X[t] ?? [])[i] ?? 0) * ((X[t] ?? [])[j] ?? 0);
      (A[i] ?? [])[j] = s;
    }
    let s = 0;
    for (let t = 0; t < n; t++) s += ((X[t] ?? [])[i] ?? 0) * (y[t] ?? 0);
    (A[i] ?? [])[k] = s;
  }
  // Forward elimination
  for (let col = 0; col < k; col++) {
    // Find pivot
    let pivotRow = col;
    let maxAbs = Math.abs((A[col] ?? [])[col] ?? 0);
    for (let row = col + 1; row < k; row++) {
      const abs = Math.abs((A[row] ?? [])[col] ?? 0);
      if (abs > maxAbs) { maxAbs = abs; pivotRow = row; }
    }
    // Swap rows
    if (pivotRow !== col) {
      const tmp = A[col];
      A[col] = A[pivotRow] ?? [];
      A[pivotRow] = tmp ?? [];
    }
    const pivotVal = (A[col] ?? [])[col] ?? 0;
    if (Math.abs(pivotVal) < 1e-14) continue; // singular/near-singular
    for (let row = col + 1; row < k; row++) {
      const factor = ((A[row] ?? [])[col] ?? 0) / pivotVal;
      for (let c = col; c <= k; c++) {
        (A[row] ?? [])[c] = ((A[row] ?? [])[c] ?? 0) - factor * ((A[col] ?? [])[c] ?? 0);
      }
    }
  }
  // Back substitution
  const beta = new Array<number>(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let val = (A[i] ?? [])[k] ?? 0;
    for (let j = i + 1; j < k; j++) val -= ((A[i] ?? [])[j] ?? 0) * (beta[j] ?? 0);
    const denom = (A[i] ?? [])[i] ?? 0;
    beta[i] = Math.abs(denom) > 1e-14 ? val / denom : 0;
  }
  return beta;
}

/** Compute ARMA(p, q) ψ-weights (MA∞ representation) up to lag `h`.
 *  ψ₀ = 1, ψⱼ = Σᵢ₌₁ᵐⁱⁿ⁽ʲ'ᵖ⁾ φᵢ ψⱼ₋ᵢ + θⱼ (θⱼ = 0 for j > q). */
function psiWeights(
  ar: readonly number[],
  ma: readonly number[],
  h: number,
): number[] {
  const psi = new Array<number>(h).fill(0);
  psi[0] = 1;
  for (let j = 1; j < h; j++) {
    let v = j <= ma.length ? (ma[j - 1] ?? 0) : 0;
    for (let i = 1; i <= Math.min(j, ar.length); i++) {
      v += (ar[i - 1] ?? 0) * (psi[j - i] ?? 0);
    }
    psi[j] = v;
  }
  return psi;
}

/** Accumulate ψ-weights d times for the integrated process (ARIMA). */
function integrateWeights(psi: readonly number[], d: number): number[] {
  let w = psi.slice();
  for (let level = 0; level < d; level++) {
    const acc = w.slice();
    for (let j = 1; j < acc.length; j++) acc[j] = (acc[j - 1] ?? 0) + (w[j] ?? 0);
    w = acc;
  }
  return w;
}

// ─── ARIMAModel class ─────────────────────────────────────────────────────────

/**
 * ARIMA(p, d, q) time-series model.
 *
 * Estimation via Hannan-Rissanen two-step; forecast CIs via ψ-weight recursion.
 */
export class ARIMAModel {
  private readonly _p: number;
  private readonly _d: number;
  private readonly _q: number;

  // Set after fit()
  private _ar: readonly number[] = [];
  private _ma: readonly number[] = [];
  private _mu: number = 0;
  private _sigma2: number = 1;
  private _origY: readonly number[] = [];
  private _inits: readonly number[] = [];
  private _diffW: readonly number[] = [];
  private _residuals: readonly number[] = [];
  private _fitted: boolean = false;

  constructor(opts: ARIMAOptions = {}) {
    this._p = Math.max(0, Math.floor(opts.p ?? 1));
    this._d = Math.max(0, Math.floor(opts.d ?? 0));
    this._q = Math.max(0, Math.floor(opts.q ?? 0));
  }

  /** AR order. */
  get p(): number { return this._p; }
  /** Differencing order. */
  get d(): number { return this._d; }
  /** MA order. */
  get q(): number { return this._q; }

  /**
   * Fit the model to `y`.
   * @param y - Observed time series (number array or Series<number>).
   */
  fit(y: readonly number[] | Series<number>): ARIMAFitResult {
    const yArr: readonly number[] = isNumericArray(y) ? y : y.values;

    const n = yArr.length;
    if (n < this._p + this._d + this._q + 2) {
      throw new RangeError(`Series too short (${n}) for ARIMA(${this._p},${this._d},${this._q})`);
    }

    // Store original series for undifferencing
    this._origY = yArr;

    // Difference
    const { w, inits } = difference(yArr, this._d);
    this._inits = inits;
    this._diffW = w;

    const m = w.length; // = n - d

    const p = this._p;
    const q = this._q;

    let arCoeffs: readonly number[];
    let maCoeffs: readonly number[];
    let intercept: number;

    if (p === 0 && q === 0) {
      // ARIMA(0,d,0): just differenced mean
      intercept = arrMean(w);
      arCoeffs = [];
      maCoeffs = [];
    } else {
      // ── Step 1: Yule-Walker AR(kMax) for proxy residuals ──────────────────
      const kMax = Math.min(Math.max(p + q + 5, 3), Math.floor(m / 5));
      const { ar: arHat } = kMax > 0 ? yuleWalkerAR(w, kMax) : { ar: [] as readonly number[] };

      // Proxy residuals: ε̂ₜ = wₜ - Σ arHat_j wₜ₋ⱼ
      const eps = new Array<number>(m).fill(0);
      for (let t = kMax; t < m; t++) {
        let pred = arrMean(w);
        for (let j = 0; j < kMax; j++) pred += (arHat[j] ?? 0) * ((w[t - 1 - j] ?? 0) - arrMean(w));
        eps[t] = (w[t] ?? 0) - pred;
      }

      // ── Step 2: OLS on ARMA(p, q) using proxy residuals ──────────────────
      // Start index: need w_{t-p} and ε̂_{t-q} available
      const s = Math.max(p, kMax + q);
      const T = m - s; // number of observations in OLS

      if (T <= p + q + 1) {
        // Fall back to pure AR if OLS is under-identified
        const { ar } = yuleWalkerAR(w, p);
        arCoeffs = ar;
        maCoeffs = new Array<number>(q).fill(0);
        intercept = 0;
      } else {
        // Design matrix: [1, w_{t-1},...,w_{t-p}, ε̂_{t-1},...,ε̂_{t-q}]
        const X: number[][] = [];
        const yOLS: number[] = [];

        for (let i = 0; i < T; i++) {
          const t = s + i;
          const row: number[] = [1];
          for (let j = 1; j <= p; j++) row.push(w[t - j] ?? 0);
          for (let j = 1; j <= q; j++) row.push(eps[t - j] ?? 0);
          X.push(row);
          yOLS.push(w[t] ?? 0);
        }

        const beta = olsSolve(X, yOLS);
        intercept = beta[0] ?? 0;
        arCoeffs = beta.slice(1, 1 + p);
        maCoeffs = beta.slice(1 + p, 1 + p + q);
      }
    }

    // ── Compute in-sample residuals ─────────────────────────────────────────
    const warmup = Math.max(p, q);
    const resid = new Array<number>(m).fill(0);
    const wHat = new Array<number>(m).fill(0);

    for (let t = 0; t < m; t++) {
      let pred = intercept;
      for (let j = 0; j < p; j++) pred += (arCoeffs[j] ?? 0) * (w[t - 1 - j] ?? 0);
      for (let j = 0; j < q; j++) pred += (maCoeffs[j] ?? 0) * (t - 1 - j >= 0 ? (resid[t - 1 - j] ?? 0) : 0);
      wHat[t] = pred;
      resid[t] = (w[t] ?? 0) - pred;
    }

    // Sigma2 from residuals after warmup
    let sse = 0;
    let cnt = 0;
    for (let t = warmup; t < m; t++) { sse += (resid[t] ?? 0) ** 2; cnt++; }
    const sigma2 = cnt > 0 ? sse / cnt : 1;

    // Fitted values on original scale via undifferencing wHat
    const fittedW = wHat;
    // fitted_y: undifference the fitted differenced series
    // We reconstruct y_hat by integrating w_hat starting from the true initial values
    const fittedY = undifference(fittedW, inits, this._d);

    // Log-likelihood and information criteria
    const k = 1 + p + q; // number of params (intercept + AR + MA)
    const logLik = -0.5 * m * (Math.log(2 * Math.PI) + Math.log(sigma2) + 1);
    const aic = -2 * logLik + 2 * k;
    const bic = -2 * logLik + Math.log(m) * k;

    this._ar = arCoeffs;
    this._ma = maCoeffs;
    this._mu = intercept;
    this._sigma2 = sigma2;
    this._residuals = resid;
    this._fitted = true;

    return {
      arCoeffs,
      maCoeffs,
      intercept,
      fittedValues: fittedY,
      residuals: resid,
      sigma2,
      logLikelihood: logLik,
      aic,
      bic,
    };
  }

  /**
   * Produce multi-step forecasts starting after the last observation.
   *
   * Must be called after {@link fit}.
   * @param steps - Number of future steps to forecast. Default: 1.
   */
  forecast(steps = 1): ARIMAForecastResult {
    if (!this._fitted) throw new Error("Call fit() before forecast()");
    if (steps < 1) throw new RangeError("steps must be >= 1");

    const w = this._diffW;
    const m = w.length;
    const ar = this._ar;
    const ma = this._ma;
    const p = this._p;
    const q = this._q;
    const mu = this._mu;
    const sigma2 = this._sigma2;

    // Residuals tail (for initializing the MA part)
    const resid = this._residuals;

    // Extend w and residuals with forecasts
    const wAll: number[] = w.slice();
    const eAll: number[] = resid.slice();

    for (let h = 1; h <= steps; h++) {
      const t = m + h - 1; // index in extended array
      let pred = mu;
      for (let j = 0; j < p; j++) pred += (ar[j] ?? 0) * (wAll[t - 1 - j] ?? 0);
      for (let j = 0; j < q; j++) {
        // future residuals are 0; only use past residuals
        const idx = t - 1 - j;
        pred += (ma[j] ?? 0) * (idx < m ? (eAll[idx] ?? 0) : 0);
      }
      wAll.push(pred);
      eAll.push(0); // future innovations are zero
    }

    // Extract the forecast steps (differenced scale)
    const fcW = wAll.slice(m);

    // Undifference to original scale
    // Need the last `d` values at each integration level
    const fcOrig = undifference(fcW, this._inits, this._d);
    // undifference returns d + steps values starting from inits;
    // but the inits represent the first observed values at each level.
    // We need to "extend" from the end of the observed data.

    // Actually, for forecasting we need to integrate starting from the last observed value.
    // Re-compute inits as the *last* values at each differencing level.
    const lastInits = computeLastInits(this._origY, this._d);
    const fcOrigCorrected = undifferenceFromLast(fcW, lastInits, this._d);

    // ψ-weights for prediction intervals
    const hMax = steps + 1;
    const psiArma = psiWeights(ar, ma, hMax);
    const psiInt = integrateWeights(psiArma, this._d);

    const forecastArr: number[] = [];
    const lowerArr: number[] = [];
    const upperArr: number[] = [];
    const stderrArr: number[] = [];

    for (let h = 1; h <= steps; h++) {
      const fc = fcOrigCorrected[h - 1] ?? 0;
      // Var[e_h] = sigma2 * sum_{j=0}^{h-1} psi_j^2
      let varH = 0;
      for (let j = 0; j < h; j++) varH += (psiInt[j] ?? 0) ** 2;
      const se = Math.sqrt(sigma2 * varH);
      forecastArr.push(fc);
      stderrArr.push(se);
      lowerArr.push(fc - 1.96 * se);
      upperArr.push(fc + 1.96 * se);
    }

    return { forecast: forecastArr, lower: lowerArr, upper: upperArr, stderr: stderrArr };
  }
}

/** Compute the last observed value at each differencing level for forecasting. */
function computeLastInits(y: readonly number[], d: number): number[] {
  const lasts: number[] = [];
  let w: number[] = y.slice();
  for (let i = 0; i < d; i++) {
    lasts.push(w[w.length - 1] ?? 0);
    const dw = new Array<number>(w.length - 1);
    for (let t = 1; t < w.length; t++) dw[t - 1] = (w[t] ?? 0) - (w[t - 1] ?? 0);
    w = dw;
  }
  return lasts;
}

/** Undifference `fcW` starting from the last observed value at each level. */
function undifferenceFromLast(
  fcW: readonly number[],
  lastInits: readonly number[],
  d: number,
): number[] {
  let w: number[] = fcW.slice();
  for (let i = d - 1; i >= 0; i--) {
    const init = lastInits[i] ?? 0;
    const un: number[] = [];
    let prev = init;
    for (const dv of w) {
      prev = prev + dv;
      un.push(prev);
    }
    w = un;
  }
  return w;
}

// ─── Convenience function ──────────────────────────────────────────────────────

/**
 * Fit an ARIMA(p, d, q) model and return a fitted {@link ARIMAModel}.
 *
 * @example
 * ```ts
 * import { fitArima } from "tsb";
 * const model = fitArima([1, 2, 3, 4, 3, 2, 1, 2, 3, 4], { p: 1, q: 1 });
 * const fc = model.forecast(3);
 * ```
 */
export function fitArima(
  y: readonly number[] | Series<number>,
  opts?: ARIMAOptions,
): ARIMAModel {
  const model = new ARIMAModel(opts);
  model.fit(y);
  return model;
}
