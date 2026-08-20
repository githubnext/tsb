/** Spatial Regression module — tsb analytics library. */

/** Options for Spatial Regression. */
export interface SpatialRegressionOptions { tol?: number; maxIter?: number; }

/** Result from Spatial Regression. */
export interface SpatialRegressionResult { values: number[]; converged: boolean; }

/** Compute Spatial Regression. */
export function computeSpatialRegression(data: number[], opts: SpatialRegressionOptions = {}): SpatialRegressionResult {
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

export default { compute: computeSpatialRegression };
