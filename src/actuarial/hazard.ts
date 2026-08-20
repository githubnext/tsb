/** Hazard module — tsb analytics library. */

/** Options for Hazard. */
export interface HazardOptions { tol?: number; maxIter?: number; }

/** Result from Hazard. */
export interface HazardResult { values: number[]; converged: boolean; }

/** Compute Hazard. */
export function computeHazard(data: number[], opts: HazardOptions = {}): HazardResult {
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

export default { compute: computeHazard };
