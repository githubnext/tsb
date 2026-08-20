/** Cv Future module — tsb analytics library. */
export interface Cv futureOptions { tol?: number; maxIter?: number; }
export interface Cv futureResult { values: number[]; converged: boolean; }
export function computeCv future(data: number[], opts: Cv futureOptions = {}): Cv futureResult {
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
export default { compute: computeCv future };
