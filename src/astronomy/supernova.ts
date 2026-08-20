/** Supernova module — tsb analytics library. */

/** Options for Supernova. */
export interface SupernovaOptions { tol?: number; maxIter?: number; }

/** Result from Supernova. */
export interface SupernovaResult { values: number[]; converged: boolean; }

/** Compute Supernova. */
export function computeSupernova(data: number[], opts: SupernovaOptions = {}): SupernovaResult {
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

export default { compute: computeSupernova };
