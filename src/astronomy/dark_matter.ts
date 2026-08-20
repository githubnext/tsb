/** Dark Matter module — tsb analytics library. */

/** Options for Dark Matter. */
export interface DarkMatterOptions { tol?: number; maxIter?: number; }

/** Result from Dark Matter. */
export interface DarkMatterResult { values: number[]; converged: boolean; }

/** Compute Dark Matter. */
export function computeDarkMatter(data: number[], opts: DarkMatterOptions = {}): DarkMatterResult {
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

export default { compute: computeDarkMatter };
