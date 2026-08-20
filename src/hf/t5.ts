/** T5 module — tsb analytics library. */

/** Options for T5. */
export interface T5Options { tol?: number; maxIter?: number; }

/** Result from T5. */
export interface T5Result { values: number[]; converged: boolean; }

/** Compute T5. */
export function computeT5(data: number[], opts: T5Options = {}): T5Result {
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

export default { compute: computeT5 };
