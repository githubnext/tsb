/** Sociology Streaming module — tsb analytics library. */
export interface Sociology streamingOptions { tol?: number; maxIter?: number; }
export interface Sociology streamingResult { values: number[]; converged: boolean; }
export function computeSociology streaming(data: number[], opts: Sociology streamingOptions = {}): Sociology streamingResult {
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
export default { compute: computeSociology streaming };
