/** Scene module — tsb analytics library. */

/** Options for Scene. */
export interface SceneOptions { tol?: number; maxIter?: number; }

/** Result from Scene. */
export interface SceneResult { values: number[]; converged: boolean; }

/** Compute Scene. */
export function computeScene(data: number[], opts: SceneOptions = {}): SceneResult {
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

export default { compute: computeScene };
