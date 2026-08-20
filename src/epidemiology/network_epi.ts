/** Network Epi module — tsb analytics library. */

/** Options for Network Epi. */
export interface NetworkEpiOptions { tol?: number; maxIter?: number; }

/** Result from Network Epi. */
export interface NetworkEpiResult { values: number[]; converged: boolean; }

/** Compute Network Epi. */
export function computeNetworkEpi(data: number[], opts: NetworkEpiOptions = {}): NetworkEpiResult {
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

export default { compute: computeNetworkEpi };
