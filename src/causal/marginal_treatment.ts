/** Marginal Treatment module — tsb analytics library. */

/** Options for Marginal Treatment. */
export interface MarginalTreatmentOptions { tol?: number; maxIter?: number; }

/** Result from Marginal Treatment. */
export interface MarginalTreatmentResult { values: number[]; converged: boolean; }

/** Compute Marginal Treatment. */
export function computeMarginalTreatment(data: number[], opts: MarginalTreatmentOptions = {}): MarginalTreatmentResult {
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

export default { compute: computeMarginalTreatment };
