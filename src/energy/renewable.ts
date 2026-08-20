/** Renewable module — tsb analytics library. */

/** Options for Renewable. */
export interface RenewableOptions { tol?: number; maxIter?: number; }

/** Result from Renewable. */
export interface RenewableResult { values: number[]; converged: boolean; }

/** Compute Renewable. */
export function computeRenewable(data: number[], opts: RenewableOptions = {}): RenewableResult {
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

export default { compute: computeRenewable };
