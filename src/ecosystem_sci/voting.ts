/** ecosystem_sci voting module — tsb analytics library. */
export interface EcosystemSciVotingOptions { tol?: number; maxIter?: number; }
export interface EcosystemSciVotingResult { values: number[]; converged: boolean; }
export function computeEcosystemSciVoting(data: number[], opts: EcosystemSciVotingOptions = {}): EcosystemSciVotingResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeEcosystemSciVoting };
