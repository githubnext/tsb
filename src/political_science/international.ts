/** International module — tsb analytics library. */

/** Options for International. */
export interface InternationalOptions { tol?: number; maxIter?: number; }

/** Result from International. */
export interface InternationalResult { values: number[]; converged: boolean; }

/** Compute International. */
export function computeInternational(data: number[], opts: InternationalOptions = {}): InternationalResult {
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

export default { compute: computeInternational };
