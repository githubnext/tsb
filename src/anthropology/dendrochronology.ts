/** Dendrochronology module — tsb analytics library. */

/** Options for Dendrochronology. */
export interface DendrochronologyOptions { tol?: number; maxIter?: number; }

/** Result from Dendrochronology. */
export interface DendrochronologyResult { values: number[]; converged: boolean; }

/** Compute Dendrochronology. */
export function computeDendrochronology(data: number[], opts: DendrochronologyOptions = {}): DendrochronologyResult {
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

export default { compute: computeDendrochronology };
