/** Freight module — tsb analytics library. */

/** Options for Freight. */
export interface FreightOptions { tol?: number; maxIter?: number; }

/** Result from Freight. */
export interface FreightResult { values: number[]; converged: boolean; }

/** Compute Freight. */
export function computeFreight(data: number[], opts: FreightOptions = {}): FreightResult {
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

export default { compute: computeFreight };
