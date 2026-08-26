/** polymer_sci patterns module — tsb analytics library. */
export interface PolymerSciPatternsOptions { tol?: number; maxIter?: number; }
export interface PolymerSciPatternsResult { values: number[]; converged: boolean; }
export function computePolymerSciPatterns(data: number[], opts: PolymerSciPatternsOptions = {}): PolymerSciPatternsResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computePolymerSciPatterns };
