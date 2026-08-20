/** Sarima module — tsb analytics library. */

/** Options for Sarima. */
export interface SarimaOptions { tol?: number; maxIter?: number; }

/** Result from Sarima. */
export interface SarimaResult { values: number[]; converged: boolean; }

/** Compute Sarima. */
export function computeSarima(data: number[], opts: SarimaOptions = {}): SarimaResult {
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

export default { compute: computeSarima };
