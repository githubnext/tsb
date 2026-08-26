/** cosmology_sci estimation module — tsb analytics library. */
export interface CosmologySciEstimationOptions { tol?: number; maxIter?: number; }
export interface CosmologySciEstimationResult { values: number[]; converged: boolean; }
export function computeCosmologySciEstimation(data: number[], opts: CosmologySciEstimationOptions = {}): CosmologySciEstimationResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeCosmologySciEstimation };
