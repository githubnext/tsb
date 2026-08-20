/** Minilm module — tsb analytics library. */

/** Options for Minilm. */
export interface MinilmOptions { tol?: number; maxIter?: number; }

/** Result from Minilm. */
export interface MinilmResult { values: number[]; converged: boolean; }

/** Compute Minilm. */
export function computeMinilm(data: number[], opts: MinilmOptions = {}): MinilmResult {
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

export default { compute: computeMinilm };
