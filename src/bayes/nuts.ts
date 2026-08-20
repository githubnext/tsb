/** Nuts module — tsb analytics library. */

/** Options for Nuts. */
export interface NutsOptions { tol?: number; maxIter?: number; }

/** Result from Nuts. */
export interface NutsResult { values: number[]; converged: boolean; }

/** Compute Nuts. */
export function computeNuts(data: number[], opts: NutsOptions = {}): NutsResult {
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

export default { compute: computeNuts };
