/** Difference In Differences Edu module — tsb analytics library. */

/** Options for Difference In Differences Edu. */
export interface DifferenceInDifferencesEduOptions { tol?: number; maxIter?: number; }

/** Result from Difference In Differences Edu. */
export interface DifferenceInDifferencesEduResult { values: number[]; converged: boolean; }

/** Compute Difference In Differences Edu. */
export function computeDifferenceInDifferencesEdu(data: number[], opts: DifferenceInDifferencesEduOptions = {}): DifferenceInDifferencesEduResult {
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

export default { compute: computeDifferenceInDifferencesEdu };
