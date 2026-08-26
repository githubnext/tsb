/** fatigue_sci modeling module — tsb analytics library. */
export interface FatigueSciModelingOptions { tol?: number; maxIter?: number; }
export interface FatigueSciModelingResult { values: number[]; converged: boolean; }
export function computeFatigueSciModeling(data: number[], opts: FatigueSciModelingOptions = {}): FatigueSciModelingResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeFatigueSciModeling };
