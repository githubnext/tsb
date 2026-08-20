/** Interrupted Time Series module — tsb analytics library. */

/** Options for Interrupted Time Series. */
export interface InterruptedTimeSeriesOptions { tol?: number; maxIter?: number; }

/** Result from Interrupted Time Series. */
export interface InterruptedTimeSeriesResult { values: number[]; converged: boolean; }

/** Compute Interrupted Time Series. */
export function computeInterruptedTimeSeries(data: number[], opts: InterruptedTimeSeriesOptions = {}): InterruptedTimeSeriesResult {
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

export default { compute: computeInterruptedTimeSeries };
