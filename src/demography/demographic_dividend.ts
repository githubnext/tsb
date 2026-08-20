/** Demographic Dividend module — tsb analytics library. */

/** Options for Demographic Dividend. */
export interface DemographicDividendOptions { tol?: number; maxIter?: number; }

/** Result from Demographic Dividend. */
export interface DemographicDividendResult { values: number[]; converged: boolean; }

/** Compute Demographic Dividend. */
export function computeDemographicDividend(data: number[], opts: DemographicDividendOptions = {}): DemographicDividendResult {
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

export default { compute: computeDemographicDividend };
