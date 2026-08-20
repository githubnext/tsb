/** Psychophysiology module — tsb analytics library. */

/** Options for Psychophysiology. */
export interface PsychophysiologyOptions { tol?: number; maxIter?: number; }

/** Result from Psychophysiology. */
export interface PsychophysiologyResult { values: number[]; converged: boolean; }

/** Compute Psychophysiology. */
export function computePsychophysiology(data: number[], opts: PsychophysiologyOptions = {}): PsychophysiologyResult {
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

export default { compute: computePsychophysiology };
