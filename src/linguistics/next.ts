/** Linguistics Next module — tsb analytics library. */
export interface Linguistics nextOptions { tol?: number; maxIter?: number; }
export interface Linguistics nextResult { values: number[]; converged: boolean; }
export function computeLinguistics next(data: number[], opts: Linguistics nextOptions = {}): Linguistics nextResult {
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
export default { compute: computeLinguistics next };
