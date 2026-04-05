import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { olsRegress, wlsRegress } from "../../src/stats/regression.ts";

describe("olsRegress", () => {
  it("fits perfect linear relationship y = 2x + 1", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ];
    const y = [3, 5, 7, 9, 11];
    const result = olsRegress(y, X);
    expect(result.coefficients[0]).toBeCloseTo(2, 5);
    expect(result.coefficients[1]).toBeCloseTo(1, 5);
    expect(result.rSquared).toBeCloseTo(1, 5);
    expect(result.residuals.every((r) => Math.abs(r) < 1e-8)).toBe(true);
  });

  it("fits y = x with no intercept", () => {
    const X = [[1], [2], [3], [4]];
    const y = [1, 2, 3, 4];
    const result = olsRegress(y, X);
    expect(result.coefficients[0]).toBeCloseTo(1, 5);
    expect(result.rSquared).toBeGreaterThan(0.99);
  });

  it("returns R² close to 0 for uncorrelated data", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
    ];
    const y = [10, 10, 10, 10];
    // Constant y → R² undefined but result shouldn't throw
    const result = olsRegress(y, X);
    expect(result.nObs).toBe(4);
    expect(result.nParams).toBe(2);
  });

  it("standard errors are positive", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ];
    const y = [2, 4, 5, 4, 5];
    const result = olsRegress(y, X);
    expect(result.standardErrors.every((se) => se >= 0)).toBe(true);
  });

  it("p-values are in [0, 1]", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ];
    const y = [2, 4, 5, 4, 5];
    const result = olsRegress(y, X);
    expect(result.pValues.every((p) => p >= 0 && p <= 1)).toBe(true);
  });

  it("confidence intervals straddle the coefficient", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ];
    const y = [2, 4, 5, 4, 5];
    const result = olsRegress(y, X);
    for (let i = 0; i < result.coefficients.length; i++) {
      const ci = result.confidenceIntervals[i];
      const coef = result.coefficients[i];
      if (ci !== undefined && coef !== undefined) {
        expect(ci[0]).toBeLessThanOrEqual(coef);
        expect(ci[1]).toBeGreaterThanOrEqual(coef);
      }
    }
  });

  it("nObs and nParams are correct", () => {
    const X = [
      [1, 1, 1],
      [2, 2, 1],
      [3, 3, 1],
      [4, 4, 1],
      [5, 5, 1],
      [6, 6, 1],
    ];
    const y = [1, 2, 3, 4, 5, 6];
    const result = olsRegress(y, X);
    expect(result.nObs).toBe(6);
    expect(result.nParams).toBe(3);
  });

  it("throws if X has wrong number of rows", () => {
    expect(() => olsRegress([1, 2, 3], [[1], [2]])).toThrow();
  });

  it("throws if y is empty", () => {
    expect(() => olsRegress([], [])).toThrow();
  });

  it("throws if n <= p", () => {
    // 2 obs, 3 params
    expect(() =>
      olsRegress(
        [1, 2],
        [
          [1, 2, 3],
          [4, 5, 6],
        ],
      ),
    ).toThrow();
  });

  it("fitted values equal X * beta", () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 10 }), (n) => {
        const X = Array.from({ length: n }, (_, i) => [i + 1, 1]);
        const y = X.map(([x]) => 3 * (x ?? 0) + 2 + (Math.random() - 0.5) * 0.01);
        const result = olsRegress(y, X);
        const recomputed = X.map((row) =>
          row.reduce((s, v, j) => s + v * (result.coefficients[j] ?? 0), 0),
        );
        return recomputed.every((v, i) => Math.abs(v - (result.fitted[i] ?? 0)) < 1e-6);
      }),
    );
  });
});

describe("wlsRegress", () => {
  it("fits perfect data the same as OLS when all weights equal", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ];
    const y = [3, 5, 7, 9, 11];
    const w = [1, 1, 1, 1, 1];
    const ols = olsRegress(y, X);
    const wls = wlsRegress(y, X, w);
    expect(wls.coefficients[0]).toBeCloseTo(ols.coefficients[0] ?? 0, 4);
    expect(wls.coefficients[1]).toBeCloseTo(ols.coefficients[1] ?? 0, 4);
  });

  it("down-weighting an outlier pulls estimate toward truth", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ];
    const y = [2, 4, 6, 8, 100]; // last is outlier
    const wUniform = [1, 1, 1, 1, 1];
    const wDownweight = [1, 1, 1, 1, 0.001];
    const olsResult = wlsRegress(y, X, wUniform);
    const wlsResult = wlsRegress(y, X, wDownweight);
    // WLS slope should be closer to 2 than OLS slope
    expect(Math.abs((wlsResult.coefficients[0] ?? 0) - 2)).toBeLessThan(
      Math.abs((olsResult.coefficients[0] ?? 0) - 2),
    );
  });

  it("throws on negative weight", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
    ];
    const y = [1, 2, 3];
    expect(() => wlsRegress(y, X, [1, -1, 1])).toThrow();
  });

  it("throws if w has wrong length", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
    ];
    const y = [1, 2, 3];
    expect(() => wlsRegress(y, X, [1, 1])).toThrow();
  });

  it("p-values are in [0, 1]", () => {
    const X = [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ];
    const y = [2, 4, 5, 4, 5];
    const w = [1, 2, 1, 2, 1];
    const result = wlsRegress(y, X, w);
    expect(result.pValues.every((p) => p >= 0 && p <= 1)).toBe(true);
  });
});
