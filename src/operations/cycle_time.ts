/** Cycle Time module — tsb analytics library. */

/** Options for Cycle Time. */
export interface CycleTimeOptions { tol?: number; maxIter?: number; }

/** Result from Cycle Time. */
export interface CycleTimeResult { values: number[]; converged: boolean; }

/** Compute Cycle Time. */
export function computeCycleTime(data: number[], opts: CycleTimeOptions = {}): CycleTimeResult {
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

export default { compute: computeCycleTime };
