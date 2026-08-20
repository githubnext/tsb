/** Health Ins module — tsb analytics library. */

/** Options for Health Ins. */
export interface HealthInsOptions { tol?: number; maxIter?: number; }

/** Result from Health Ins. */
export interface HealthInsResult { values: number[]; converged: boolean; }

/** Compute Health Ins. */
export function computeHealthIns(data: number[], opts: HealthInsOptions = {}): HealthInsResult {
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

export default { compute: computeHealthIns };
