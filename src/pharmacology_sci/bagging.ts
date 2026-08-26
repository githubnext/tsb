/** pharmacology_sci bagging module — tsb analytics library. */
export interface PharmacologySciBaggingOptions { tol?: number; maxIter?: number; }
export interface PharmacologySciBaggingResult { values: number[]; converged: boolean; }
export function computePharmacologySciBagging(data: number[], opts: PharmacologySciBaggingOptions = {}): PharmacologySciBaggingResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computePharmacologySciBagging };
