/** 3Pl module — tsb analytics library. */

/** Options for 3Pl. */
export interface 3plOptions { tol?: number; maxIter?: number; }

/** Result from 3Pl. */
export interface 3plResult { values: number[]; converged: boolean; }

/** Compute 3Pl. */
export function compute3pl(data: number[], opts: 3plOptions = {}): 3plResult {
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

export default { compute: compute3pl };
