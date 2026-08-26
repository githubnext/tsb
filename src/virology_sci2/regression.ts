/** virology_sci2 regression module — tsb analytics library. */
export interface VirologySci2RegressionOptions { tol?: number; maxIter?: number; }
export interface VirologySci2RegressionResult { values: number[]; converged: boolean; }
export function computeVirologySci2Regression(data: number[], opts: VirologySci2RegressionOptions = {}): VirologySci2RegressionResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeVirologySci2Regression };
