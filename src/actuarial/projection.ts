/** Projection module — tsb analytics library. */

/** Options for Projection. */
export interface ProjectionOptions { tol?: number; maxIter?: number; }

/** Result from Projection. */
export interface ProjectionResult { values: number[]; converged: boolean; }

/** Compute Projection. */
export function computeProjection(data: number[], opts: ProjectionOptions = {}): ProjectionResult {
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

export default { compute: computeProjection };
