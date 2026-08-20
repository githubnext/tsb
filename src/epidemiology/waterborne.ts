/** Waterborne module — tsb analytics library. */

/** Options for Waterborne. */
export interface WaterborneOptions { tol?: number; maxIter?: number; }

/** Result from Waterborne. */
export interface WaterborneResult { values: number[]; converged: boolean; }

/** Compute Waterborne. */
export function computeWaterborne(data: number[], opts: WaterborneOptions = {}): WaterborneResult {
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

export default { compute: computeWaterborne };
