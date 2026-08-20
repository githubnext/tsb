/** Prs module — tsb analytics library. */

/** Options for Prs. */
export interface PrsOptions { tol?: number; maxIter?: number; }

/** Result from Prs. */
export interface PrsResult { values: number[]; converged: boolean; }

/** Compute Prs. */
export function computePrs(data: number[], opts: PrsOptions = {}): PrsResult {
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

export default { compute: computePrs };
