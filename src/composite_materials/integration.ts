/** composite_materials integration module — tsb analytics library. */
export interface CompositeMaterialsIntegrationOptions { tol?: number; maxIter?: number; }
export interface CompositeMaterialsIntegrationResult { values: number[]; converged: boolean; }
export function computeCompositeMaterialsIntegration(data: number[], opts: CompositeMaterialsIntegrationOptions = {}): CompositeMaterialsIntegrationResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeCompositeMaterialsIntegration };
