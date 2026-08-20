/** Photometry module — tsb analytics library. */

/** Options for Photometry. */
export interface PhotometryOptions { tol?: number; maxIter?: number; }

/** Result from Photometry. */
export interface PhotometryResult { values: number[]; converged: boolean; }

/** Compute Photometry. */
export function computePhotometry(data: number[], opts: PhotometryOptions = {}): PhotometryResult {
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

export default { compute: computePhotometry };
