/** Meteorology Robust module — tsb analytics library. */
export interface Meteorology robustOptions { tol?: number; maxIter?: number; }
export interface Meteorology robustResult { values: number[]; converged: boolean; }
export function computeMeteorology robust(data: number[], opts: Meteorology robustOptions = {}): Meteorology robustResult {
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
export default { compute: computeMeteorology robust };
