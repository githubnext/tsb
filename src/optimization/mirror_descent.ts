/** Mirror Descent module — tsb analytics library. */

/** Options for Mirror Descent. */
export interface MirrorDescentOptions { tol?: number; maxIter?: number; }

/** Result from Mirror Descent. */
export interface MirrorDescentResult { values: number[]; converged: boolean; }

/** Compute Mirror Descent. */
export function computeMirrorDescent(data: number[], opts: MirrorDescentOptions = {}): MirrorDescentResult {
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

export default { compute: computeMirrorDescent };
