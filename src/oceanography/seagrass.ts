/** Seagrass module — tsb analytics library. */

/** Options for Seagrass. */
export interface SeagrassOptions { tol?: number; maxIter?: number; }

/** Result from Seagrass. */
export interface SeagrassResult { values: number[]; converged: boolean; }

/** Compute Seagrass. */
export function computeSeagrass(data: number[], opts: SeagrassOptions = {}): SeagrassResult {
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

export default { compute: computeSeagrass };
