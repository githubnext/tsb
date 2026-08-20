/** Radio Telemetry module — tsb analytics library. */

/** Options for Radio Telemetry. */
export interface RadioTelemetryOptions { tol?: number; maxIter?: number; }

/** Result from Radio Telemetry. */
export interface RadioTelemetryResult { values: number[]; converged: boolean; }

/** Compute Radio Telemetry. */
export function computeRadioTelemetry(data: number[], opts: RadioTelemetryOptions = {}): RadioTelemetryResult {
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

export default { compute: computeRadioTelemetry };
