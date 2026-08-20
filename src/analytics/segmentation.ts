/** Segmentation module — tsb analytics library. */

/** Options for Segmentation. */
export interface SegmentationOptions { tol?: number; maxIter?: number; }

/** Result from Segmentation. */
export interface SegmentationResult { values: number[]; converged: boolean; }

/** Compute Segmentation. */
export function computeSegmentation(data: number[], opts: SegmentationOptions = {}): SegmentationResult {
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

export default { compute: computeSegmentation };
