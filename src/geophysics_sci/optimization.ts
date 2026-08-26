/** geophysics_sci optimization module — tsb analytics library. */
export interface GeophysicsSciOptimizationOptions { tol?: number; maxIter?: number; }
export interface GeophysicsSciOptimizationResult { values: number[]; converged: boolean; }
export function computeGeophysicsSciOptimization(data: number[], opts: GeophysicsSciOptimizationOptions = {}): GeophysicsSciOptimizationResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeGeophysicsSciOptimization };
