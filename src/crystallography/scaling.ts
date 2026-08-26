/** crystallography scaling module — tsb analytics library. */
export interface CrystallographyScalingOptions { tol?: number; maxIter?: number; }
export interface CrystallographyScalingResult { values: number[]; converged: boolean; }
export function computeCrystallographyScaling(data: number[], opts: CrystallographyScalingOptions = {}): CrystallographyScalingResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeCrystallographyScaling };
