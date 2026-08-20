/** Binary module — tsb analytics library. */

/** Options for Binary. */
export interface BinaryOptions { tol?: number; maxIter?: number; }

/** Result from Binary. */
export interface BinaryResult { values: number[]; converged: boolean; }

/** Compute Binary. */
export function computeBinary(data: number[], opts: BinaryOptions = {}): BinaryResult {
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

export default { compute: computeBinary };
