/** Lemmatizer module — tsb analytics library. */

/** Options for Lemmatizer. */
export interface LemmatizerOptions { tol?: number; maxIter?: number; }

/** Result from Lemmatizer. */
export interface LemmatizerResult { values: number[]; converged: boolean; }

/** Compute Lemmatizer. */
export function computeLemmatizer(data: number[], opts: LemmatizerOptions = {}): LemmatizerResult {
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

export default { compute: computeLemmatizer };
