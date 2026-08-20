/** Demography Batch module — tsb analytics library. */
export interface Demography batchOptions { tol?: number; maxIter?: number; }
export interface Demography batchResult { values: number[]; converged: boolean; }
export function computeDemography batch(data: number[], opts: Demography batchOptions = {}): Demography batchResult {
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
export default { compute: computeDemography batch };
