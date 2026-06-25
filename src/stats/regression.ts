/**
 * regression — linear and polynomial regression analysis.
 *
 * Mirrors `scipy.stats.linregress`, `numpy.polyfit / polyval`, and a
 * statsmodels-inspired `OLS` class for multiple ordinary least squares
 * regression. Implemented from scratch with no external dependencies.
 *
 * Implemented functions/classes:
 * - {@link linregress}  — simple OLS linear regression with full statistics
 * - {@link polyfit}     — polynomial regression via least squares
 * - {@link polyval}     — evaluate a polynomial (Horner's method)
 * - {@link OLS}         — multiple ordinary least squares regression
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Result of {@link linregress} — mirrors `scipy.stats.LinregressResult`.
 *
 * @example
 * ```ts
 * const r = linregress([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
 * console.log(r.slope, r.intercept, r.rvalue);
 * ```
 */
export interface LinregressResult {
  /** Slope of the regression line. */
  readonly slope: number;
  /** Intercept of the regression line. */
  readonly intercept: number;
  /** Pearson correlation coefficient r ∈ [−1, 1]. */
  readonly rvalue: number;
  /** Two-tailed p-value for the slope (H₀: slope = 0). */
  readonly pvalue: number;
  /** Standard error of the slope estimate: sqrt(MSE / Sxx). */
  readonly stderr: number;
  /** Standard error of the intercept estimate. */
  readonly intercept_stderr: number;
}

/**
 * Fitted OLS model returned by {@link OLS.fit}.
 *
 * Mirrors the summary statistics produced by `statsmodels.OLS.fit()`.
 */
export interface OLSResult {
  /**
   * Estimated regression coefficients (params), one per predictor column
   * plus the intercept term when `addIntercept` is `true` (default).
   * Intercept is always **last** when present, matching statsmodels convention.
   */
  readonly params: readonly number[];
  /** Names of the coefficient parameters (column names + "const" if intercept). */
  readonly paramNames: readonly string[];
  /** Standard errors of each coefficient (square roots of diagonal of covariance matrix). */
  readonly bse: readonly number[];
  /** t-statistics for each coefficient. */
  readonly tvalues: readonly number[];
  /** Two-tailed p-values for each coefficient (H₀: coef = 0). */
  readonly pvalues: readonly number[];
  /** R² (coefficient of determination). */
  readonly rsquared: number;
  /** Adjusted R². */
  readonly rsquared_adj: number;
  /** Overall F-statistic (model vs. intercept-only). */
  readonly fvalue: number;
  /** p-value for the F-statistic. */
  readonly f_pvalue: number;
  /** Number of observations. */
  readonly nobs: number;
  /** Degrees of freedom of the model (number of regressors excluding intercept). */
  readonly df_model: number;
  /** Degrees of freedom of the residuals (nobs − number of params). */
  readonly df_resid: number;
  /** Sum of squared residuals (RSS). */
  readonly ssr: number;
  /** Explained sum of squares (ESS = TSS − SSR). */
  readonly ess: number;
  /** Total sum of squares (TSS). */
  readonly tss: number;
  /** Mean squared error of residuals (ssr / df_resid). */
  readonly mse_resid: number;
  /** Log-likelihood of the fitted model (assuming normal errors). */
  readonly llf: number;
  /** Akaike information criterion. */
  readonly aic: number;
  /** Bayesian information criterion. */
  readonly bic: number;
  /**
   * Predict response values for new data.
   *
   * @param X  Predictors — must have the same number of columns as the
   *           training data (without the intercept column).
   */
  predict(X: readonly (readonly number[])[] | DataFrame): readonly number[];
  /** Return a human-readable OLS summary table (plain text). */
  summary(): string;
}

/** Options for {@link OLS}. */
export interface OLSOptions {
  /**
   * Whether to add a constant (intercept) column to the design matrix.
   * Defaults to `true`.
   */
  readonly addIntercept?: boolean;
}

// ─── internal math primitives ─────────────────────────────────────────────────

/** Lanczos approximation coefficients (g=7, 9-term). */
const LG_C: readonly number[] = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/**
 * Natural log of the Gamma function via Lanczos approximation (g=7).
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

const FPMIN = 1e-300;
const BETA_MAX_ITER = 300;
const BETA_EPS = 1e-14;

/**
 * Regularized incomplete beta function I_x(a, b).
 *
 * Uses Lentz's continued-fraction method with symmetry for convergence.
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
  if (x > (a + 1.0) / (a + b + 2.0)) {
    return 1.0 - regIncBeta(1.0 - x, b, a);
  }
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1.0 - x) - lbeta) / a;
  let c = 1.0;
  let d = 1.0 - ((a + b) * x) / (a + 1.0);
  if (Math.abs(d) < FPMIN) {
    d = FPMIN;
  }
  d = 1.0 / d;
  let h = d;
  for (let m = 1; m <= BETA_MAX_ITER; m++) {
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

/** t-distribution survival function: P(T > t) for t ≥ 0 with `df` degrees of freedom. */
function tDistSF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 0.5 * regIncBeta(x, df / 2, 0.5);
}

/** F-distribution survival function: P(F > f) for df1, df2 degrees of freedom. */
function fDistSF(f: number, df1: number, df2: number): number {
  if (f <= 0) {
    return 1;
  }
  const bx = df2 / (df2 + df1 * f);
  return regIncBeta(bx, df2 / 2, df1 / 2);
}

/** Convert Series or number[] to a plain number[]. */
function toNumbers(v: readonly number[] | Series): number[] {
  if (v instanceof Series) {
    const out: number[] = [];
    for (const val of v.values) {
      if (typeof val === "number") {
        out.push(val);
      }
    }
    return out;
  }
  return [...v];
}

// ─── matrix helpers ────────────────────────────────────────────────────────────

/** Transpose an m×n matrix to n×m. */
function transpose(A: readonly (readonly number[])[]): number[][] {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let i = 0; i < m; i++) {
    const row = A[i];
    if (row === undefined) {
      continue;
    }
    for (let j = 0; j < n; j++) {
      const outRow = out[j];
      if (outRow !== undefined) {
        outRow[i] = row[j] ?? 0;
      }
    }
  }
  return out;
}

/** Matrix multiply A (m×k) × B (k×n) → m×n. */
function matMul(A: readonly (readonly number[])[], B: readonly (readonly number[])[]): number[][] {
  const m = A.length;
  const k = B.length;
  const n = B[0]?.length ?? 0;
  const out: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < m; i++) {
    const rowA = A[i];
    const outRow = out[i];
    if (rowA === undefined || outRow === undefined) {
      continue;
    }
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) {
        s += (rowA[p] ?? 0) * (B[p]?.[j] ?? 0);
      }
      outRow[j] = s;
    }
  }
  return out;
}

/**
 * Solve the square linear system A x = b using Gaussian elimination with
 * partial pivoting. Returns the solution vector x.
 */
function solveLinear(A: readonly (readonly number[])[], b: readonly number[]): number[] {
  const n = A.length;
  const M: number[][] = A.map((row) => [...row]);
  const rhs: number[] = [...b];

  for (let col = 0; col < n; col++) {
    // Partial pivoting: find row with largest absolute value in this column
    let maxRow = col;
    let maxVal = Math.abs(M[col]?.[col] ?? 0);
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(M[row]?.[col] ?? 0);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      const tmpRow = M[col];
      const swapRow = M[maxRow];
      if (tmpRow !== undefined && swapRow !== undefined) {
        M[col] = swapRow;
        M[maxRow] = tmpRow;
      }
      const tmpRhs = rhs[col] ?? 0;
      rhs[col] = rhs[maxRow] ?? 0;
      rhs[maxRow] = tmpRhs;
    }

    const pivot = M[col]?.[col] ?? 0;
    if (Math.abs(pivot) < 1e-14) {
      continue;
    }
    for (let row = col + 1; row < n; row++) {
      const rowM = M[row];
      const colM = M[col];
      if (rowM === undefined || colM === undefined) {
        continue;
      }
      const factor = (rowM[col] ?? 0) / pivot;
      for (let j = col; j < n; j++) {
        rowM[j] = (rowM[j] ?? 0) - factor * (colM[j] ?? 0);
      }
      rhs[row] = (rhs[row] ?? 0) - factor * (rhs[col] ?? 0);
    }
  }

  // Back substitution
  const x: number[] = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let s = rhs[row] ?? 0;
    const rowM = M[row];
    for (let j = row + 1; j < n; j++) {
      s -= (rowM?.[j] ?? 0) * (x[j] ?? 0);
    }
    const diag = rowM?.[row] ?? 0;
    x[row] = Math.abs(diag) < 1e-14 ? 0 : s / diag;
  }
  return x;
}

/**
 * Invert a square matrix by solving n systems with unit vectors.
 * Returns the n×n inverse matrix (or near-zero for singular inputs).
 */
function invertMatrix(A: readonly (readonly number[])[]): number[][] {
  const n = A.length;
  const inv: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let j = 0; j < n; j++) {
    const e: number[] = new Array<number>(n).fill(0);
    e[j] = 1;
    const col = solveLinear(A, e);
    for (let i = 0; i < n; i++) {
      const invRow = inv[i];
      if (invRow !== undefined) {
        invRow[j] = col[i] ?? 0;
      }
    }
  }
  return inv;
}

// ─── linregress ───────────────────────────────────────────────────────────────

/**
 * Compute a simple ordinary least-squares linear regression of `y` on `x`.
 *
 * Mirrors `scipy.stats.linregress(x, y)`.
 *
 * @param x  Predictor values (array-like or Series of numbers).
 * @param y  Response values (same length as `x`).
 * @returns  {@link LinregressResult} with slope, intercept, r, p, stderr,
 *           and intercept_stderr.
 *
 * @example
 * ```ts
 * const result = linregress([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
 * // result.slope     ≈ 0.6
 * // result.intercept ≈ 2.2
 * // result.rvalue    ≈ 0.7746
 * // result.pvalue    ≈ 0.1233
 * ```
 */
export function linregress(
  x: readonly number[] | Series,
  y: readonly number[] | Series,
): LinregressResult {
  const xs = toNumbers(x);
  const ys = toNumbers(y);
  const n = xs.length;
  if (n < 2) {
    throw new RangeError(`linregress requires at least 2 data points, got ${n}`);
  }
  if (ys.length !== n) {
    throw new RangeError(`x and y must have the same length: x=${n}, y=${ys.length}`);
  }

  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const xi = xs[i] ?? 0;
    const yi = ys[i] ?? 0;
    sx += xi;
    sy += yi;
    sxx += xi * xi;
    sxy += xi * yi;
    syy += yi * yi;
  }

  const ssxx = sxx - (sx * sx) / n;
  const ssyy = syy - (sy * sy) / n;
  const ssxy = sxy - (sx * sy) / n;

  if (Math.abs(ssxx) < 1e-14) {
    return {
      slope: Number.NaN,
      intercept: Number.NaN,
      rvalue: Number.NaN,
      pvalue: Number.NaN,
      stderr: Number.NaN,
      intercept_stderr: Number.NaN,
    };
  }

  const slope = ssxy / ssxx;
  const intercept = (sy - slope * sx) / n;

  let rvalue: number;
  if (ssxx <= 0 || ssyy <= 0) {
    rvalue = 0;
  } else {
    rvalue = ssxy / Math.sqrt(ssxx * ssyy);
    rvalue = Math.max(-1, Math.min(1, rvalue));
  }

  const df = n - 2;
  const sResid = ssyy - slope * ssxy;
  const mse = df > 0 ? sResid / df : 0;

  const stderr = mse > 0 ? Math.sqrt(mse / ssxx) : 0;
  const intercept_stderr = mse > 0 ? Math.sqrt(mse * (1 / n + (sx / n) ** 2 / ssxx)) : 0;

  const tStat = stderr > 0 ? slope / stderr : slope === 0 ? 0 : Number.POSITIVE_INFINITY;
  const pvalue = df > 0 ? Math.min(1, 2 * tDistSF(Math.abs(tStat), df)) : Number.NaN;

  return {
    slope,
    intercept,
    rvalue,
    pvalue: Math.max(0, pvalue),
    stderr,
    intercept_stderr,
  };
}

// ─── polyfit / polyval ────────────────────────────────────────────────────────

/**
 * Fit a polynomial of degree `deg` to the data `(x, y)` using least squares.
 *
 * Mirrors `numpy.polyfit(x, y, deg)`.
 *
 * Returns the polynomial coefficients in **descending** degree order
 * (highest degree first), so `coefs[0]` is the coefficient of `x^deg`.
 *
 * @param x    Predictor values.
 * @param y    Response values (same length as `x`).
 * @param deg  Polynomial degree (≥ 0).
 * @returns    Coefficient array of length `deg + 1`, highest degree first.
 *
 * @example
 * ```ts
 * const coefs = polyfit([0, 1, 2, 3], [0, 1, 4, 9], 2);
 * // coefs ≈ [1, 0, 0]   (y = x²)
 * const y2 = polyval(coefs, 5);   // ≈ 25
 * ```
 */
export function polyfit(
  x: readonly number[] | Series,
  y: readonly number[] | Series,
  deg: number,
): number[] {
  const xs = toNumbers(x);
  const ys = toNumbers(y);
  const n = xs.length;
  const d = Math.round(deg);
  if (d < 0) {
    throw new RangeError(`deg must be ≥ 0, got ${deg}`);
  }
  if (n < d + 1) {
    throw new RangeError(`polyfit requires at least deg+1=${d + 1} points, got ${n}`);
  }

  // Build Vandermonde matrix V[i][j] = x[i]^(deg-j) for j in [0..deg]
  // Row order: highest power first so row[0] = x^d, row[d] = x^0 = 1
  const V: number[][] = Array.from({ length: n }, (_, i) => {
    const xi = xs[i] ?? 0;
    const row: number[] = new Array<number>(d + 1).fill(0);
    let p = 1;
    for (let j = d; j >= 0; j--) {
      row[j] = p;
      p *= xi;
    }
    return row;
  });

  // Normal equations: V'V c = V'y
  const Vt = transpose(V);
  const VtV = matMul(Vt, V);
  const Vty = matMul(
    Vt,
    ys.map((yi) => [yi]),
  ).map((r) => r[0] ?? 0);
  return solveLinear(VtV, Vty);
}

/**
 * Evaluate a polynomial at values `x` using Horner's method.
 *
 * Mirrors `numpy.polyval(coefs, x)`.
 * Coefficients must be in **descending** degree order (highest first), as
 * returned by {@link polyfit}.
 *
 * @param coefs  Polynomial coefficients, highest degree first.
 * @param x      Scalar or array of x values to evaluate at.
 * @returns      Scalar if `x` is a number, number[] otherwise.
 *
 * @example
 * ```ts
 * polyval([1, -3, 2], 2);            // 2² - 3·2 + 2 = 0
 * polyval([1, -3, 2], [0, 1, 2]);    // [2, 0, 0]
 * ```
 */
export function polyval(coefs: readonly number[], x: number): number;
export function polyval(coefs: readonly number[], x: readonly number[] | Series): number[];
export function polyval(
  coefs: readonly number[],
  x: number | readonly number[] | Series,
): number | number[] {
  const evalOne = (xi: number): number => {
    let result = 0;
    for (const c of coefs) {
      result = result * xi + c;
    }
    return result;
  };
  if (typeof x === "number") {
    return evalOne(x);
  }
  const xs = toNumbers(x as readonly number[] | Series);
  return xs.map(evalOne);
}

// ─── OLS ──────────────────────────────────────────────────────────────────────

/**
 * Ordinary Least Squares (OLS) regression model.
 *
 * Mirrors the `statsmodels.OLS` API. Supports any number of predictors
 * (multiple regression), optional intercept, and produces the full set of
 * diagnostic statistics.
 *
 * @example
 * ```ts
 * const model = new OLS();
 * const result = model.fit(
 *   [[1], [2], [3], [4], [5]],   // X (n×k design matrix, without intercept)
 *   [2, 4, 5, 4, 5],             // y
 * );
 * console.log(result.rsquared, result.fvalue);
 * console.log(result.summary());
 * ```
 */
export class OLS {
  private readonly _addIntercept: boolean;

  /** Create a new OLS model. Intercept is added by default. */
  constructor(options: OLSOptions = {}) {
    this._addIntercept = options.addIntercept ?? true;
  }

  /**
   * Fit the OLS model to design matrix `X` and response vector `y`.
   *
   * @param X  Predictor matrix — shape n×k. Accepts a 2-D number[][], a
   *           DataFrame, or a 1-D number[] (treated as n×1).
   * @param y  Response vector — length n. Array or Series.
   * @returns  Fitted {@link OLSResult}.
   */
  fit(
    X: readonly (readonly number[])[] | DataFrame | readonly number[],
    y: readonly number[] | Series,
  ): OLSResult {
    // Materialise X as an n×k number[][]
    let rawX: number[][];
    let colNames: string[];
    if (X instanceof DataFrame) {
      colNames = [...X.columns.values] as string[];
      const cols = (X.columns.values as readonly string[]).map((col) => {
        const s = X.col(col);
        return [...s.values].map((v) => (typeof v === "number" ? v : Number(v)));
      });
      rawX = transpose(cols);
    } else if (typeof X[0] === "number") {
      rawX = (X as readonly number[]).map((v) => [v as number]);
      colNames = ["x1"];
    } else {
      rawX = (X as readonly (readonly number[])[]).map((row) => [...row]);
      colNames = Array.from({ length: rawX[0]?.length ?? 0 }, (_, i) => `x${i + 1}`);
    }

    const ys = toNumbers(y);
    const n = ys.length;
    if (rawX.length !== n) {
      throw new RangeError(
        `X and y must have the same number of observations: X has ${rawX.length} rows, y has ${n}`,
      );
    }
    const _k = rawX[0]?.length ?? 0;

    // Build design matrix: optionally append intercept column (value 1)
    const designNames: string[] = this._addIntercept ? [...colNames, "const"] : [...colNames];
    const design: number[][] = rawX.map((row) => (this._addIntercept ? [...row, 1] : [...row]));
    const p = design[0]?.length ?? 0;

    if (n < p) {
      throw new RangeError(`OLS requires at least ${p} observations for ${p} parameters, got ${n}`);
    }

    // Normal equations: (X'X) β = X'y
    const Xt = transpose(design);
    const XtX = matMul(Xt, design);
    const XtY = matMul(
      Xt,
      ys.map((yi) => [yi]),
    ).map((r) => r[0] ?? 0);
    const params = solveLinear(XtX, XtY);

    // Fitted values and residuals
    const fitted = design.map((row) => row.reduce((s, xi, j) => s + xi * (params[j] ?? 0), 0));
    const residuals = ys.map((yi, i) => yi - (fitted[i] ?? 0));
    const ssr = residuals.reduce((s, e) => s + e * e, 0);
    const yMean = ys.reduce((s, v) => s + v, 0) / n;
    const tss = ys.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const ess = tss - ssr;

    const dfResid = n - p;
    const dfModel = this._addIntercept ? p - 1 : p;
    const mseResid = dfResid > 0 ? ssr / dfResid : 0;

    // Covariance matrix: mseResid × (X'X)^{-1}
    const XtXinv = invertMatrix(XtX);
    const bse = XtXinv.map((row, i) => {
      const varI = (row[i] ?? 0) * mseResid;
      return varI > 0 ? Math.sqrt(varI) : 0;
    });

    const tvalues = params.map((b, i) => {
      const se = bse[i] ?? 0;
      if (se > 0) {
        return b / se;
      }
      return b === 0 ? 0 : Number.POSITIVE_INFINITY;
    });
    const pvalues = tvalues.map((t) =>
      dfResid > 0 ? Math.min(1, 2 * tDistSF(Math.abs(t), dfResid)) : Number.NaN,
    );

    const rsquared = tss > 0 ? 1 - ssr / tss : 0;
    const rsquaredAdj = dfResid > 0 && tss > 0 ? 1 - ssr / dfResid / (tss / (n - 1)) : rsquared;

    const msModel = dfModel > 0 ? ess / dfModel : 0;
    const fvalue = mseResid > 0 ? msModel / mseResid : Number.POSITIVE_INFINITY;
    const fPvalue = dfModel > 0 && dfResid > 0 ? fDistSF(fvalue, dfModel, dfResid) : Number.NaN;

    // Log-likelihood (normal errors: σ² = mseResid)
    const sigma2 = mseResid > 0 ? mseResid : 1;
    const llf = (-n / 2) * Math.log(2 * Math.PI) - (n / 2) * Math.log(sigma2) - ssr / (2 * sigma2);
    // k-params includes all coefficients + 1 for σ²
    const kParams = p + 1;
    const aic = 2 * kParams - 2 * llf;
    const bic = kParams * Math.log(n) - 2 * llf;

    const addIntercept = this._addIntercept;

    const result: OLSResult = {
      params: Object.freeze([...params]),
      paramNames: Object.freeze([...designNames]),
      bse: Object.freeze([...bse]),
      tvalues: Object.freeze([...tvalues]),
      pvalues: Object.freeze([...pvalues]),
      rsquared,
      rsquared_adj: rsquaredAdj,
      fvalue,
      f_pvalue: Math.max(0, Math.min(1, fPvalue)),
      nobs: n,
      df_model: dfModel,
      df_resid: dfResid,
      ssr,
      ess,
      tss,
      mse_resid: mseResid,
      llf,
      aic,
      bic,
      predict(newX: readonly (readonly number[])[] | DataFrame): readonly number[] {
        let rows: number[][];
        if (newX instanceof DataFrame) {
          const cols = (newX.columns.values as readonly string[]).map((col) => {
            const s = newX.col(col);
            return [...s.values].map((v) => (typeof v === "number" ? v : Number(v)));
          });
          rows = transpose(cols);
        } else {
          rows = (newX as readonly (readonly number[])[]).map((r) => [...r]);
        }
        return rows.map((row) => {
          const full = addIntercept ? [...row, 1] : [...row];
          return full.reduce((s, xi, j) => s + xi * (params[j] ?? 0), 0);
        });
      },
      summary(): string {
        const fmt = (v: number, w = 10, d = 4): string =>
          Number.isFinite(v) ? v.toFixed(d).padStart(w) : String(v).padStart(w);
        const line = "=".repeat(72);
        const dashes = "-".repeat(72);
        let s = `${line}\n`;
        s += "OLS Regression Results\n";
        s += `${dashes}\n`;
        s += `R-squared:     ${rsquared.toFixed(4).padStart(12)}   F-statistic:      ${fmt(fvalue)}\n`;
        s += `Adj. R²:       ${rsquaredAdj.toFixed(4).padStart(12)}   Prob(F-statistic):${fmt(fPvalue)}\n`;
        s += `No. Obs.:      ${String(n).padStart(12)}   Df Residuals:     ${String(dfResid).padStart(10)}\n`;
        s += `AIC:           ${aic.toFixed(4).padStart(12)}   BIC:              ${bic.toFixed(4).padStart(10)}\n`;
        s += `${line}\n`;
        s += `${"Variable".padEnd(14)} ${"coef".padStart(10)} ${"std err".padStart(10)} ${"t".padStart(10)} ${"P>|t|".padStart(10)}\n`;
        s += `${dashes}\n`;
        for (let i = 0; i < designNames.length; i++) {
          const name = (designNames[i] ?? "").substring(0, 13).padEnd(14);
          s += `${name} ${fmt(params[i] ?? Number.NaN)} ${fmt(bse[i] ?? Number.NaN)} ${fmt(tvalues[i] ?? Number.NaN)} ${fmt(pvalues[i] ?? Number.NaN)}\n`;
        }
        s += `${line}\n`;
        return s;
      },
    };
    return result;
  }
}
