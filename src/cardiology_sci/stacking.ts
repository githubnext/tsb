/** cardiology_sci stacking module — tsb analytics library. */
export interface CardiologySciStackingOptions { tol?: number; maxIter?: number; }
export interface CardiologySciStackingResult { values: number[]; converged: boolean; }
export function computeCardiologySciStacking(data: number[], opts: CardiologySciStackingOptions = {}): CardiologySciStackingResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeCardiologySciStacking };
