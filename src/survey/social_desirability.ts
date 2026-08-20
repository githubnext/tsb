/** Social Desirability module — tsb analytics library. */

/** Options for Social Desirability. */
export interface SocialDesirabilityOptions { tol?: number; maxIter?: number; }

/** Result from Social Desirability. */
export interface SocialDesirabilityResult { values: number[]; converged: boolean; }

/** Compute Social Desirability. */
export function computeSocialDesirability(data: number[], opts: SocialDesirabilityOptions = {}): SocialDesirabilityResult {
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

export default { compute: computeSocialDesirability };
