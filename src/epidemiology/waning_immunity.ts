/** Waning Immunity module — tsb analytics library. */

/** Options for Waning Immunity. */
export interface WaningImmunityOptions { tol?: number; maxIter?: number; }

/** Result from Waning Immunity. */
export interface WaningImmunityResult { values: number[]; converged: boolean; }

/** Compute Waning Immunity. */
export function computeWaningImmunity(data: number[], opts: WaningImmunityOptions = {}): WaningImmunityResult {
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

export default { compute: computeWaningImmunity };
