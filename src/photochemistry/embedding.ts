/** photochemistry embedding module — tsb analytics library. */
export interface PhotochemistryEmbeddingOptions { tol?: number; maxIter?: number; }
export interface PhotochemistryEmbeddingResult { values: number[]; converged: boolean; }
export function computePhotochemistryEmbedding(data: number[], opts: PhotochemistryEmbeddingOptions = {}): PhotochemistryEmbeddingResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computePhotochemistryEmbedding };
