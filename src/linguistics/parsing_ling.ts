/** Parsing Ling module — tsb analytics library. */

/** Options for Parsing Ling. */
export interface ParsingLingOptions { tol?: number; maxIter?: number; }

/** Result from Parsing Ling. */
export interface ParsingLingResult { values: number[]; converged: boolean; }

/** Compute Parsing Ling. */
export function computeParsingLing(data: number[], opts: ParsingLingOptions = {}): ParsingLingResult {
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

export default { compute: computeParsingLing };
