/** Stochastic Epi module — tsb analytics library. */

/** Options for Stochastic Epi. */
export interface StochasticEpiOptions { tol?: number; maxIter?: number; }

/** Result from Stochastic Epi. */
export interface StochasticEpiResult { values: number[]; converged: boolean; }

/** Compute Stochastic Epi. */
export function computeStochasticEpi(data: number[], opts: StochasticEpiOptions = {}): StochasticEpiResult {
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

export default { compute: computeStochasticEpi };
