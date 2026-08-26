/** volcanology integral module — tsb analytics library. */
export interface VolcanologyIntegralOptions { tol?: number; maxIter?: number; }
export interface VolcanologyIntegralResult { values: number[]; converged: boolean; }
export function computeVolcanologyIntegral(data: number[], opts: VolcanologyIntegralOptions = {}): VolcanologyIntegralResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeVolcanologyIntegral };
