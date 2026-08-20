/** Fraud Ins module — tsb analytics library. */

/** Options for Fraud Ins. */
export interface FraudInsOptions { tol?: number; maxIter?: number; }

/** Result from Fraud Ins. */
export interface FraudInsResult { values: number[]; converged: boolean; }

/** Compute Fraud Ins. */
export function computeFraudIns(data: number[], opts: FraudInsOptions = {}): FraudInsResult {
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

export default { compute: computeFraudIns };
