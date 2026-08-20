/** Migration Geo module — tsb analytics library. */

/** Options for Migration Geo. */
export interface MigrationGeoOptions { tol?: number; maxIter?: number; }

/** Result from Migration Geo. */
export interface MigrationGeoResult { values: number[]; converged: boolean; }

/** Compute Migration Geo. */
export function computeMigrationGeo(data: number[], opts: MigrationGeoOptions = {}): MigrationGeoResult {
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

export default { compute: computeMigrationGeo };
