/** Remote Sensing Anth module — tsb analytics library. */

/** Options for Remote Sensing Anth. */
export interface RemoteSensingAnthOptions { tol?: number; maxIter?: number; }

/** Result from Remote Sensing Anth. */
export interface RemoteSensingAnthResult { values: number[]; converged: boolean; }

/** Compute Remote Sensing Anth. */
export function computeRemoteSensingAnth(data: number[], opts: RemoteSensingAnthOptions = {}): RemoteSensingAnthResult {
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

export default { compute: computeRemoteSensingAnth };
