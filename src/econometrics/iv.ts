/** Iv module — tsb analytics library. */

/** Options for Iv. */
export interface IvOptions { tol?: number; maxIter?: number; }

/** Result from Iv. */
export interface IvResult { values: number[]; converged: boolean; }

/** Compute Iv. */
export function computeIv(data: number[], opts: IvOptions = {}): IvResult {
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

export default { compute: computeIv };
