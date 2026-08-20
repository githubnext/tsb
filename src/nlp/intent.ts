/** Intent module — tsb analytics library. */

/** Options for Intent. */
export interface IntentOptions { tol?: number; maxIter?: number; }

/** Result from Intent. */
export interface IntentResult { values: number[]; converged: boolean; }

/** Compute Intent. */
export function computeIntent(data: number[], opts: IntentOptions = {}): IntentResult {
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

export default { compute: computeIntent };
