/** Population Genetics Anth module — tsb analytics library. */

/** Options for Population Genetics Anth. */
export interface PopulationGeneticsAnthOptions { tol?: number; maxIter?: number; }

/** Result from Population Genetics Anth. */
export interface PopulationGeneticsAnthResult { values: number[]; converged: boolean; }

/** Compute Population Genetics Anth. */
export function computePopulationGeneticsAnth(data: number[], opts: PopulationGeneticsAnthOptions = {}): PopulationGeneticsAnthResult {
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

export default { compute: computePopulationGeneticsAnth };
