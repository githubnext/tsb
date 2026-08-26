/** cryosphere_sci calibration module — tsb analytics library. */
export interface CryosphereSciCalibrationOptions { tol?: number; maxIter?: number; }
export interface CryosphereSciCalibrationResult { values: number[]; converged: boolean; }
export function computeCryosphereSciCalibration(data: number[], opts: CryosphereSciCalibrationOptions = {}): CryosphereSciCalibrationResult {
  const { tol = 1e-6, maxIter = 100 } = opts;
  let v = data.slice(), iter = 0, prev = Infinity;
  while (iter++ < maxIter) {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (Math.abs(m - prev) < tol) break;
    prev = m; v = v.map(x => x - m * 0.01);
  }
  return { values: v, converged: iter <= maxIter };
}
export default { compute: computeCryosphereSciCalibration };
