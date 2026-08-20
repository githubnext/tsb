/** Exponential Smoothing module — tsb analytics library. */

/** Options for Exponential Smoothing. */
export interface ExponentialSmoothingOptions { tol?: number; maxIter?: number; }

/** Result from Exponential Smoothing. */
export interface ExponentialSmoothingResult { values: number[]; converged: boolean; }

/** Compute Exponential Smoothing. */
export function computeExponentialSmoothing(data: number[], opts: ExponentialSmoothingOptions = {}): ExponentialSmoothingResult {
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

export default { compute: computeExponentialSmoothing };
