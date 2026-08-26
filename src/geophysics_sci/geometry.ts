/** geophysics_sci geometry module — tsb analytics library. */
export interface GeophysicsSciGeometryOptions { tol?: number; maxIter?: number; }
export interface GeophysicsSciGeometryResult { values: number[]; converged: boolean; }
export function computeGeophysicsSciGeometry(data: number[], opts: GeophysicsSciGeometryOptions = {}): GeophysicsSciGeometryResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeGeophysicsSciGeometry };
