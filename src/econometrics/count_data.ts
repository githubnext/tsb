/** Count Data module — tsb analytics library. */

/** Options for Count Data. */
export interface CountDataOptions { tol?: number; maxIter?: number; }

/** Result from Count Data. */
export interface CountDataResult { values: number[]; converged: boolean; }

/** Compute Count Data. */
export function computeCountData(data: number[], opts: CountDataOptions = {}): CountDataResult {
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

export default { compute: computeCountData };
