/**
 * Ordinary Least Squares (OLS) and Weighted Least Squares (WLS) regression.
 *
 * - `olsRegress`   — Fit a multiple OLS regression model
 * - `wlsRegress`   — Fit a WLS regression model with per-observation weights
 *
 * Results include coefficients, standard errors, t-statistics, p-values,
 * confidence intervals, R², adjusted R², and an F-statistic.
 *
 * @example
 * ```ts
 * import { olsRegress } from "tsb";
 * const result = olsRegress([1, 2, 3, 4, 5], [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]]);
 * console.log(result.coefficients); // [1, 0] (slope=1, intercept=0)
 * ```
 *
 * @module
 */

// ─── result type ──────────────────────────────────────────────────────────────

/** Regression fit result. */
export interface RegressionResult {
  /** Fitted coefficients, one per column of X. */
  coefficients: readonly number[];
  /** Standard errors of each coefficient. */
  standardErrors: readonly number[];
  /** t-statistics for each coefficient (coef / se). */
  tStatistics: readonly number[];
  /** Two-sided p-values for each coefficient. */
  pValues: readonly number[];
  /** 95% confidence intervals for each coefficient: [lower, upper]. */
  confidenceIntervals: readonly [number, number][];
  /** Fitted (predicted) values. */
  fitted: readonly number[];
  /** Residuals (y − ŷ). */
  residuals: readonly number[];
  /** R-squared (coefficient of determination). */
  rSquared: number;
  /** Adjusted R-squared. */
  rSquaredAdj: number;
  /** F-statistic for overall model significance. */
  fStatistic: number;
  /** p-value for the F-statistic. */
  fPValue: number;
  /** Number of observations. */
  nObs: number;
  /** Number of parameters (including intercept if present). */
  nParams: number;
  /** Mean squared error of residuals. */
  mse: number;
}

// ─── math helpers ─────────────────────────────────────────────────────────────

/** Log-gamma via Lanczos approximation. */
function lnGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  const zz = z - 1;
  let x = c[0] ?? 0;
  for (let i = 1; i < g + 2; i++) {
    x += (c[i] ?? 0) / (zz + i);
  }
  const t = zz + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Regularized incomplete beta continued-fraction (Lentz). */
function betaCF(a: number, b: number, x: number): number {
  const maxIter = 200;
  let f = 1e-30;
  let c = f;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-30) {
    d = 1e-30;
  }
  d = 1 / d;
  f = d;
  for (let m = 1; m <= maxIter; m++) {
    // Even step
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }
    d = 1 / d;
    f *= d * c;
    // Odd step
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }
    d = 1 / d;
    const del = d * c;
    f *= del;
    if (Math.abs(del - 1) < 1e-10) {
      break;
    }
  }
  return f;
}

/** Regularized incomplete beta I(x; a, b). */
function betaInc(x: number, a: number, b: number): number {
  if (x <= 0) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }
  const lbeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;
  if (x < (a + 1) / (a + b + 2)) {
    return front * betaCF(a, b, x);
  }
  return 1 - (Math.exp(b * Math.log(1 - x) + a * Math.log(x) - lbeta) / b) * betaCF(b, a, 1 - x);
}

/** Two-tailed p-value from t-statistic with df degrees of freedom. */
function twoTailP(t: number, df: number): number {
  const x = df / (df + t * t);
  return betaInc(x, df / 2, 0.5);
}

/** Survival function of F distribution: P(X > f) for X ~ F(d1, d2). */
function fSf(f: number, d1: number, d2: number): number {
  if (f <= 0) {
    return 1;
  }
  const x = d2 / (d2 + d1 * f);
  return betaInc(x, d2 / 2, d1 / 2);
}

/** t critical value for 95% CI (two-tailed α=0.05) via bisection. */
function tCritical95(df: number): number {
  // Approximate via bisection
  let lo = 0;
  let hi = 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (twoTailP(mid, df) > 0.05) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// ─── matrix helpers ──────────────────────────────────────────────────────────

type Mat = number[][];

/** Transpose matrix. */
function transpose(A: Mat): Mat {
  const rows = A.length;
  const cols = A[0]?.length ?? 0;
  const T: Mat = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      (T[j] as number[])[i] = (A[i] as number[])[j] ?? 0;
    }
  }
  return T;
}

/** Matrix multiply A (m×k) × B (k×n) → (m×n). */
function matmul(A: Mat, B: Mat): Mat {
  const m = A.length;
  const k = A[0]?.length ?? 0;
  const n = B[0]?.length ?? 0;
  const C: Mat = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let p = 0; p < k; p++) {
      const aip = (A[i] as number[])[p] ?? 0;
      if (aip === 0) {
        continue;
      }
      for (let j = 0; j < n; j++) {
        const ci = C[i];
        if (ci !== undefined) {
          ci[j] = (ci[j] ?? 0) + aip * ((B[p] as number[])[j] ?? 0);
        }
      }
    }
  }
  return C;
}

/** Find pivot row index (partial pivoting) for column `col` in augmented matrix. */
function findPivot(aug: Mat, col: number, n: number): { maxRow: number; maxVal: number } {
  let maxRow = col;
  let maxVal = Math.abs((aug[col] as number[])[col] ?? 0);
  for (let row = col + 1; row < n; row++) {
    const v = Math.abs((aug[row] as number[])[col] ?? 0);
    if (v > maxVal) {
      maxVal = v;
      maxRow = row;
    }
  }
  return { maxRow, maxVal };
}

/** Scale row `col` of augmented matrix so the diagonal element becomes 1. */
function scaleRow(aug: Mat, col: number, n: number): void {
  const pivot = (aug[col] as number[])[col] ?? 1;
  for (let j = 0; j < 2 * n; j++) {
    (aug[col] as number[])[j] = ((aug[col] as number[])[j] ?? 0) / pivot;
  }
}

/** Eliminate column `col` from all rows except `col` itself. */
function eliminateCol(aug: Mat, col: number, n: number): void {
  for (let row = 0; row < n; row++) {
    if (row === col) {
      continue;
    }
    const factor = (aug[row] as number[])[col] ?? 0;
    for (let j = 0; j < 2 * n; j++) {
      (aug[row] as number[])[j] =
        ((aug[row] as number[])[j] ?? 0) - factor * ((aug[col] as number[])[j] ?? 0);
    }
  }
}

/** Invert an n×n matrix via Gauss-Jordan elimination. Returns null if singular. */
function invertMatrix(A: Mat): Mat | null {
  const n = A.length;
  const aug: Mat = A.map((row, i) =>
    row.map((v) => v).concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))),
  );
  for (let col = 0; col < n; col++) {
    const { maxRow, maxVal } = findPivot(aug, col, n);
    if (maxVal < 1e-14) {
      return null;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow] as number[], aug[col] as number[]];
    scaleRow(aug, col, n);
    eliminateCol(aug, col, n);
  }
  return aug.map((row) => (row as number[]).slice(n));
}

// ─── core regression engine ───────────────────────────────────────────────────

function computeRegression(
  y: readonly number[],
  X: Mat,
  W: readonly number[] | null,
): RegressionResult {
  const n = y.length;
  const p = X[0]?.length ?? 0;

  // Build weighted versions
  const Xw: Mat = W
    ? X.map((row, i) => row.map((v) => v * Math.sqrt(W[i] ?? 1)))
    : X.map((row) => [...row]);
  const yw: number[] = W ? y.map((v, i) => v * Math.sqrt(W[i] ?? 1)) : [...y];

  const Xt = transpose(Xw);
  const XtX = matmul(Xt, Xw);
  const Xty = Xt.map((row) => row.reduce((s, v, i) => s + v * (yw[i] ?? 0), 0));

  const XtXinv = invertMatrix(XtX);
  if (!XtXinv) {
    throw new Error("regression: design matrix is singular or nearly singular");
  }

  // Solve for coefficients: β = (XᵀX)⁻¹ Xᵀy
  const beta: number[] = XtXinv.map((row) => row.reduce((s, v, j) => s + v * (Xty[j] ?? 0), 0));

  // Fitted values and residuals
  const fitted = X.map((row) => row.reduce((s, v, j) => s + v * (beta[j] ?? 0), 0));
  const residuals = y.map((yi, i) => yi - (fitted[i] ?? 0));

  // Degrees of freedom
  const dfModel = p - 1;
  const dfResid = n - p;

  // SSR, SSE, SST
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  const sst = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const sse = residuals.reduce((s, v) => s + v ** 2, 0);
  const ssr = sst - sse;

  const mse = dfResid > 0 ? sse / dfResid : 0;
  const rSquared = sst > 0 ? 1 - sse / sst : 0;
  const rSquaredAdj = dfResid > 0 && n > 1 ? 1 - (1 - rSquared) * ((n - 1) / dfResid) : 0;

  // F-statistic
  const msr = dfModel > 0 ? ssr / dfModel : 0;
  const fStatistic = mse > 0 ? msr / mse : 0;
  const fPValue = fSf(fStatistic, dfModel, dfResid);

  // Standard errors, t-stats, p-values
  const seVec = XtXinv.map((row, j) => Math.sqrt(mse * (row[j] ?? 0)));
  const tStats = beta.map((b, j) => {
    const se = seVec[j] ?? 0;
    return se > 0 ? b / se : Number.POSITIVE_INFINITY;
  });
  const pValues = tStats.map((t) => twoTailP(t, dfResid));
  const tc = dfResid > 0 ? tCritical95(dfResid) : 0;
  const cis: [number, number][] = beta.map((b, j) => {
    const margin = tc * (seVec[j] ?? 0);
    return [b - margin, b + margin];
  });

  return {
    coefficients: beta,
    standardErrors: seVec,
    tStatistics: tStats,
    pValues,
    confidenceIntervals: cis,
    fitted,
    residuals,
    rSquared,
    rSquaredAdj,
    fStatistic,
    fPValue,
    nObs: n,
    nParams: p,
    mse,
  };
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Ordinary Least Squares (OLS) regression.
 *
 * Fits β in `y = Xβ + ε` by minimizing `‖y − Xβ‖²`. The design matrix `X`
 * must already include an intercept column (a column of ones) if desired.
 *
 * @param y  - Response vector of length `n`.
 * @param X  - Design matrix of shape `[n, p]`. Include a column of ones for
 *   an intercept term.
 * @returns Regression result with coefficients, SE, t-stats, p-values, R², F.
 *
 * @example
 * ```ts
 * // Simple linear regression with intercept: y = a·x + b
 * const X = [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]];
 * const y = [2, 4, 5, 4, 5];
 * const result = olsRegress(y, X);
 * console.log(result.coefficients); // [slope, intercept]
 * console.log(result.rSquared);     // ≈ 0.6
 * ```
 */
export function olsRegress(
  y: readonly number[],
  X: readonly (readonly number[])[],
): RegressionResult {
  const n = y.length;
  if (n === 0) {
    throw new Error("olsRegress: y must be non-empty");
  }
  if (X.length !== n) {
    throw new Error("olsRegress: X must have the same number of rows as y");
  }
  const p = X[0]?.length ?? 0;
  if (p === 0) {
    throw new Error("olsRegress: X must have at least one column");
  }
  if (n <= p) {
    throw new Error("olsRegress: requires more observations than parameters");
  }

  return computeRegression(y, X as Mat, null);
}

/**
 * Weighted Least Squares (WLS) regression.
 *
 * Equivalent to OLS on the scaled system `Wy = WXβ` where W = diag(√w).
 * Observations with larger weights have more influence on the fit.
 *
 * @param y  - Response vector of length `n`.
 * @param X  - Design matrix of shape `[n, p]`.
 * @param w  - Non-negative weight for each observation (length `n`).
 * @returns Regression result with coefficients, SE, t-stats, p-values, R², F.
 *
 * @example
 * ```ts
 * const X = [[1, 1], [2, 1], [3, 1], [4, 1]];
 * const y = [1, 2, 3, 4];
 * const w = [1, 1, 1, 10]; // downweight last point
 * const result = wlsRegress(y, X, w);
 * console.log(result.coefficients[0]); // slope close to 1
 * ```
 */
export function wlsRegress(
  y: readonly number[],
  X: readonly (readonly number[])[],
  w: readonly number[],
): RegressionResult {
  const n = y.length;
  if (n === 0) {
    throw new Error("wlsRegress: y must be non-empty");
  }
  if (X.length !== n) {
    throw new Error("wlsRegress: X must have the same number of rows as y");
  }
  if (w.length !== n) {
    throw new Error("wlsRegress: w must have the same length as y");
  }
  if (w.some((wi) => wi < 0)) {
    throw new Error("wlsRegress: all weights must be non-negative");
  }
  const p = X[0]?.length ?? 0;
  if (p === 0) {
    throw new Error("wlsRegress: X must have at least one column");
  }
  if (n <= p) {
    throw new Error("wlsRegress: requires more observations than parameters");
  }

  return computeRegression(y, X as Mat, w);
}
