/** Anthropology Parallel module — tsb analytics library. */
export interface Anthropology parallelOptions { tol?: number; maxIter?: number; }
export interface Anthropology parallelResult { values: number[]; converged: boolean; }
export function computeAnthropology parallel(data: number[], opts: Anthropology parallelOptions = {}): Anthropology parallelResult {
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
export default { compute: computeAnthropology parallel };
