/** Hypergraph module — tsb analytics library. */

/** Options for Hypergraph. */
export interface HypergraphOptions { tol?: number; maxIter?: number; }

/** Result from Hypergraph. */
export interface HypergraphResult { values: number[]; converged: boolean; }

/** Compute Hypergraph. */
export function computeHypergraph(data: number[], opts: HypergraphOptions = {}): HypergraphResult {
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

export default { compute: computeHypergraph };
