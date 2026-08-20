/** Source Separation module — tsb analytics library. */

/** Options for Source Separation. */
export interface SourceSeparationOptions { tol?: number; maxIter?: number; }

/** Result from Source Separation. */
export interface SourceSeparationResult { values: number[]; converged: boolean; }

/** Compute Source Separation. */
export function computeSourceSeparation(data: number[], opts: SourceSeparationOptions = {}): SourceSeparationResult {
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

export default { compute: computeSourceSeparation };
