/** Insurance Xlarge module — tsb analytics library. */
export interface Insurance xlargeOptions { tol?: number; maxIter?: number; }
export interface Insurance xlargeResult { values: number[]; converged: boolean; }
export function computeInsurance xlarge(data: number[], opts: Insurance xlargeOptions = {}): Insurance xlargeResult {
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
export default { compute: computeInsurance xlarge };
