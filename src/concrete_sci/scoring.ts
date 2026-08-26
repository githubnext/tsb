/** concrete_sci scoring module — tsb analytics library. */
export interface ConcreteSciScoringOptions { tol?: number; maxIter?: number; }
export interface ConcreteSciScoringResult { values: number[]; converged: boolean; }
export function computeConcreteSciScoring(data: number[], opts: ConcreteSciScoringOptions = {}): ConcreteSciScoringResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeConcreteSciScoring };
