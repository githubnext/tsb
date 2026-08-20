/** Convexity module — tsb analytics library. */

/** Options for Convexity. */
export interface ConvexityOptions { tol?: number; maxIter?: number; }

/** Result from Convexity. */
export interface ConvexityResult { values: number[]; converged: boolean; }

/** Compute Convexity. */
export function computeConvexity(data: number[], opts: ConvexityOptions = {}): ConvexityResult {
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

export default { compute: computeConvexity };
