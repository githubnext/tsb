/** Survival module — tsb analytics library. */

/** Options for Survival. */
export interface SurvivalOptions { tol?: number; maxIter?: number; }

/** Result from Survival. */
export interface SurvivalResult { values: number[]; converged: boolean; }

/** Compute Survival. */
export function computeSurvival(data: number[], opts: SurvivalOptions = {}): SurvivalResult {
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

export default { compute: computeSurvival };
