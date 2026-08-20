/** Mortality Transition module — tsb analytics library. */

/** Options for Mortality Transition. */
export interface MortalityTransitionOptions { tol?: number; maxIter?: number; }

/** Result from Mortality Transition. */
export interface MortalityTransitionResult { values: number[]; converged: boolean; }

/** Compute Mortality Transition. */
export function computeMortalityTransition(data: number[], opts: MortalityTransitionOptions = {}): MortalityTransitionResult {
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

export default { compute: computeMortalityTransition };
