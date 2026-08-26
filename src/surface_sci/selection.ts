/** surface_sci selection module — tsb analytics library. */
export interface SurfaceSciSelectionOptions { tol?: number; maxIter?: number; }
export interface SurfaceSciSelectionResult { values: number[]; converged: boolean; }
export function computeSurfaceSciSelection(data: number[], opts: SurfaceSciSelectionOptions = {}): SurfaceSciSelectionResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeSurfaceSciSelection };
