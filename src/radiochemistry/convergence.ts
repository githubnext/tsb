/** radiochemistry convergence module — tsb analytics library. */
export interface RadiochemistryConvergenceOptions { tol?: number; maxIter?: number; }
export interface RadiochemistryConvergenceResult { values: number[]; converged: boolean; }
export function computeRadiochemistryConvergence(data: number[], opts: RadiochemistryConvergenceOptions = {}): RadiochemistryConvergenceResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeRadiochemistryConvergence };
