/** concrete_sci modeling module — tsb analytics library. */
export interface ConcreteSciModelingOptions { tol?: number; maxIter?: number; }
export interface ConcreteSciModelingResult { values: number[]; converged: boolean; }
export function computeConcreteSciModeling(data: number[], opts: ConcreteSciModelingOptions = {}): ConcreteSciModelingResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeConcreteSciModeling };
