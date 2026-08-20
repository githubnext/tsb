/** Gpt2 module — tsb analytics library. */

/** Options for Gpt2. */
export interface Gpt2Options { tol?: number; maxIter?: number; }

/** Result from Gpt2. */
export interface Gpt2Result { values: number[]; converged: boolean; }

/** Compute Gpt2. */
export function computeGpt2(data: number[], opts: Gpt2Options = {}): Gpt2Result {
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

export default { compute: computeGpt2 };
