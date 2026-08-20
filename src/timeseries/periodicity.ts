/** Periodicity module — tsb analytics library. */

/** Options for Periodicity. */
export interface PeriodicityOptions { tol?: number; maxIter?: number; }

/** Result from Periodicity. */
export interface PeriodicityResult { values: number[]; converged: boolean; }

/** Compute Periodicity. */
export function computePeriodicity(data: number[], opts: PeriodicityOptions = {}): PeriodicityResult {
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

export default { compute: computePeriodicity };
