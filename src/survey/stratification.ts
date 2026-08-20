/** Stratification module — tsb analytics library. */

/** Options for Stratification. */
export interface StratificationOptions { tol?: number; maxIter?: number; }

/** Result from Stratification. */
export interface StratificationResult { values: number[]; converged: boolean; }

/** Compute Stratification. */
export function computeStratification(data: number[], opts: StratificationOptions = {}): StratificationResult {
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

export default { compute: computeStratification };
