/** Decision Analysis module — tsb analytics library. */

/** Options for Decision Analysis. */
export interface DecisionAnalysisOptions { tol?: number; maxIter?: number; }

/** Result from Decision Analysis. */
export interface DecisionAnalysisResult { values: number[]; converged: boolean; }

/** Compute Decision Analysis. */
export function computeDecisionAnalysis(data: number[], opts: DecisionAnalysisOptions = {}): DecisionAnalysisResult {
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

export default { compute: computeDecisionAnalysis };
