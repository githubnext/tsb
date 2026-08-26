/** virology_sci2 jacobian module — tsb analytics library. */
export interface VirologySci2JacobianOptions { tol?: number; maxIter?: number; }
export interface VirologySci2JacobianResult { values: number[]; converged: boolean; }
export function computeVirologySci2Jacobian(data: number[], opts: VirologySci2JacobianOptions = {}): VirologySci2JacobianResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeVirologySci2Jacobian };
