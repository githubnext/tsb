/** thin_films decoding module — tsb analytics library. */
export interface ThinFilmsDecodingOptions { tol?: number; maxIter?: number; }
export interface ThinFilmsDecodingResult { values: number[]; converged: boolean; }
export function computeThinFilmsDecoding(data: number[], opts: ThinFilmsDecodingOptions = {}): ThinFilmsDecodingResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeThinFilmsDecoding };
