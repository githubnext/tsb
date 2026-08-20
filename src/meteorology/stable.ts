/** Meteorology Stable module — tsb analytics library. */
export interface Meteorology stableOptions { tol?: number; maxIter?: number; }
export interface Meteorology stableResult { values: number[]; converged: boolean; }
export function computeMeteorology stable(data: number[], opts: Meteorology stableOptions = {}): Meteorology stableResult {
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
export default { compute: computeMeteorology stable };
