/** concrete_sci cross_validation module — tsb analytics library. */
export interface ConcreteSciCrossValidationOptions { tol?: number; maxIter?: number; }
export interface ConcreteSciCrossValidationResult { values: number[]; converged: boolean; }
export function computeConcreteSciCrossValidation(data: number[], opts: ConcreteSciCrossValidationOptions = {}): ConcreteSciCrossValidationResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeConcreteSciCrossValidation };
