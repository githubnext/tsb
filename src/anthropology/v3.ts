/** Anthropology V3 module — tsb analytics library. */
export interface Anthropology v3Options { tol?: number; maxIter?: number; }
export interface Anthropology v3Result { values: number[]; converged: boolean; }
export function computeAnthropology v3(data: number[], opts: Anthropology v3Options = {}): Anthropology v3Result {
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
export default { compute: computeAnthropology v3 };
