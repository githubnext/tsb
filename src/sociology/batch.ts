/** Sociology Batch module — tsb analytics library. */
export interface Sociology batchOptions { tol?: number; maxIter?: number; }
export interface Sociology batchResult { values: number[]; converged: boolean; }
export function computeSociology batch(data: number[], opts: Sociology batchOptions = {}): Sociology batchResult {
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
export default { compute: computeSociology batch };
