/** Decision module — tsb analytics library. */

/** Options for Decision. */
export interface DecisionOptions { tol?: number; maxIter?: number; }

/** Result from Decision. */
export interface DecisionResult { values: number[]; converged: boolean; }

/** Compute Decision. */
export function computeDecision(data: number[], opts: DecisionOptions = {}): DecisionResult {
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

export default { compute: computeDecision };
