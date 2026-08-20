/** Computational module — tsb analytics library. */

/** Options for Computational. */
export interface ComputationalOptions { tol?: number; maxIter?: number; }

/** Result from Computational. */
export interface ComputationalResult { values: number[]; converged: boolean; }

/** Compute Computational. */
export function computeComputational(data: number[], opts: ComputationalOptions = {}): ComputationalResult {
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

export default { compute: computeComputational };
