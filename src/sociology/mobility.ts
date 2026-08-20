/** Mobility module — tsb analytics library. */

/** Options for Mobility. */
export interface MobilityOptions { tol?: number; maxIter?: number; }

/** Result from Mobility. */
export interface MobilityResult { values: number[]; converged: boolean; }

/** Compute Mobility. */
export function computeMobility(data: number[], opts: MobilityOptions = {}): MobilityResult {
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

export default { compute: computeMobility };
