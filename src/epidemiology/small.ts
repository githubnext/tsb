/** Epidemiology Small module — tsb analytics library. */
export interface Epidemiology smallOptions { tol?: number; maxIter?: number; }
export interface Epidemiology smallResult { values: number[]; converged: boolean; }
export function computeEpidemiology small(data: number[], opts: Epidemiology smallOptions = {}): Epidemiology smallResult {
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
export default { compute: computeEpidemiology small };
