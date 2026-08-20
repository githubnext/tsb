/** Pooling module — tsb analytics library. */

/** Options for Pooling. */
export interface PoolingOptions { tol?: number; maxIter?: number; }

/** Result from Pooling. */
export interface PoolingResult { values: number[]; converged: boolean; }

/** Compute Pooling. */
export function computePooling(data: number[], opts: PoolingOptions = {}): PoolingResult {
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

export default { compute: computePooling };
