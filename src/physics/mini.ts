/** Physics Mini module — tsb analytics library. */
export interface Physics miniOptions { tol?: number; maxIter?: number; }
export interface Physics miniResult { values: number[]; converged: boolean; }
export function computePhysics mini(data: number[], opts: Physics miniOptions = {}): Physics miniResult {
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
export default { compute: computePhysics mini };
