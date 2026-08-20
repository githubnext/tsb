/** Policy Energy module — tsb analytics library. */

/** Options for Policy Energy. */
export interface PolicyEnergyOptions { tol?: number; maxIter?: number; }

/** Result from Policy Energy. */
export interface PolicyEnergyResult { values: number[]; converged: boolean; }

/** Compute Policy Energy. */
export function computePolicyEnergy(data: number[], opts: PolicyEnergyOptions = {}): PolicyEnergyResult {
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

export default { compute: computePolicyEnergy };
