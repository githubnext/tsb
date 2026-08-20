/** Spline Grad module — tsb analytics library. */

/** Options for Spline Grad. */
export interface SplineGradOptions { tol?: number; maxIter?: number; }

/** Result from Spline Grad. */
export interface SplineGradResult { values: number[]; converged: boolean; }

/** Compute Spline Grad. */
export function computeSplineGrad(data: number[], opts: SplineGradOptions = {}): SplineGradResult {
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

export default { compute: computeSplineGrad };
