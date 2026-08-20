/** Modern Human Origins module — tsb analytics library. */

/** Options for Modern Human Origins. */
export interface ModernHumanOriginsOptions { tol?: number; maxIter?: number; }

/** Result from Modern Human Origins. */
export interface ModernHumanOriginsResult { values: number[]; converged: boolean; }

/** Compute Modern Human Origins. */
export function computeModernHumanOrigins(data: number[], opts: ModernHumanOriginsOptions = {}): ModernHumanOriginsResult {
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

export default { compute: computeModernHumanOrigins };
