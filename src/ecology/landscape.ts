/** Landscape module — tsb analytics library. */

/** Options for Landscape. */
export interface LandscapeOptions { tol?: number; maxIter?: number; }

/** Result from Landscape. */
export interface LandscapeResult { values: number[]; converged: boolean; }

/** Compute Landscape. */
export function computeLandscape(data: number[], opts: LandscapeOptions = {}): LandscapeResult {
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

export default { compute: computeLandscape };
