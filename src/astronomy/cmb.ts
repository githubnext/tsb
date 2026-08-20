/** Cmb module — tsb analytics library. */

/** Options for Cmb. */
export interface CmbOptions { tol?: number; maxIter?: number; }

/** Result from Cmb. */
export interface CmbResult { values: number[]; converged: boolean; }

/** Compute Cmb. */
export function computeCmb(data: number[], opts: CmbOptions = {}): CmbResult {
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

export default { compute: computeCmb };
