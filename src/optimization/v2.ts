/** Optimization V2 module — tsb analytics library. */
export interface Optimization v2Options { tol?: number; maxIter?: number; }
export interface Optimization v2Result { values: number[]; converged: boolean; }
export function computeOptimization v2(data: number[], opts: Optimization v2Options = {}): Optimization v2Result {
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
export default { compute: computeOptimization v2 };
