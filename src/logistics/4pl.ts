/** 4Pl module — tsb analytics library. */

/** Options for 4Pl. */
export interface 4plOptions { tol?: number; maxIter?: number; }

/** Result from 4Pl. */
export interface 4plResult { values: number[]; converged: boolean; }

/** Compute 4Pl. */
export function compute4pl(data: number[], opts: 4plOptions = {}): 4plResult {
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

export default { compute: compute4pl };
