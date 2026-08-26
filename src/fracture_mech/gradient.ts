/** fracture_mech gradient module — tsb analytics library. */
export interface FractureMechGradientOptions { tol?: number; maxIter?: number; }
export interface FractureMechGradientResult { values: number[]; converged: boolean; }
export function computeFractureMechGradient(data: number[], opts: FractureMechGradientOptions = {}): FractureMechGradientResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeFractureMechGradient };
