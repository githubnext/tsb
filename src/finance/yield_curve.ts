/** Yield Curve module — tsb analytics library. */

/** Options for Yield Curve. */
export interface YieldCurveOptions { tol?: number; maxIter?: number; }

/** Result from Yield Curve. */
export interface YieldCurveResult { values: number[]; converged: boolean; }

/** Compute Yield Curve. */
export function computeYieldCurve(data: number[], opts: YieldCurveOptions = {}): YieldCurveResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  if (!data.length) return { values: [], converged: true };
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}

export default { compute: computeYieldCurve };
