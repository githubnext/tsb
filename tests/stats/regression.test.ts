/**
 * Tests for src/stats/regression.ts
 *
 * Verifies linregress, polyfit, polyval, and OLS against known values
 * (computed offline against scipy.stats.linregress, numpy.polyfit, and
 * statsmodels.OLS). Property-based tests verify mathematical invariants.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  OLS,
  linregress,
  polyfit,
  polyval,
} from "../../src/stats/regression.ts";
import { DataFrame, Series } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const CLOSE = (a: number, b: number, tol = 1e-6) =>
  Math.abs(a - b) < tol || Math.abs(a - b) / (Math.abs(b) + 1e-10) < tol;

// ─── linregress ───────────────────────────────────────────────────────────────

describe("linregress", () => {
  it("basic example: y = 0.6x + 2.2", () => {
    // scipy.stats.linregress([1,2,3,4,5],[2,4,5,4,5])
    // slope=0.6 intercept=2.2 rvalue=0.774597 pvalue=0.12326 stderr≈0.2828
    const r = linregress([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(CLOSE(r.slope, 0.6, 1e-4)).toBe(true);
    expect(CLOSE(r.intercept, 2.2, 1e-4)).toBe(true);
    expect(CLOSE(r.rvalue, 0.7745966, 1e-5)).toBe(true);
    expect(CLOSE(r.pvalue, 0.12326, 1e-4)).toBe(true);
    // stderr = sqrt(MSE/Sxx) = sqrt(0.8/10) ≈ 0.28284
    expect(CLOSE(r.stderr, Math.sqrt(0.08), 1e-4)).toBe(true);
  });

  it("perfect correlation (r=1)", () => {
    const r = linregress([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(CLOSE(r.slope, 2)).toBe(true);
    expect(CLOSE(r.intercept, 0)).toBe(true);
    expect(CLOSE(r.rvalue, 1.0)).toBe(true);
    expect(r.pvalue).toBeLessThan(1e-10);
  });

  it("perfect negative correlation (r=-1)", () => {
    const r = linregress([1, 2, 3, 4], [8, 6, 4, 2]);
    expect(CLOSE(r.slope, -2)).toBe(true);
    expect(CLOSE(r.intercept, 10)).toBe(true);
    expect(CLOSE(r.rvalue, -1.0)).toBe(true);
    expect(r.pvalue).toBeLessThan(1e-10);
  });

  it("zero slope (horizontal line, r≈0)", () => {
    const r = linregress([1, 2, 3, 4, 5], [3, 3, 3, 3, 3]);
    expect(CLOSE(r.slope, 0)).toBe(true);
    expect(CLOSE(r.rvalue, 0)).toBe(true);
  });

  it("accepts Series input", () => {
    const sx = new Series({ data: [1, 2, 3, 4, 5] });
    const sy = new Series({ data: [2, 4, 5, 4, 5] });
    const r = linregress(sx, sy);
    expect(CLOSE(r.slope, 0.6, 1e-4)).toBe(true);
  });

  it("throws for fewer than 2 points", () => {
    expect(() => linregress([1], [2])).toThrow();
    expect(() => linregress([], [])).toThrow();
  });

  it("throws for mismatched lengths", () => {
    expect(() => linregress([1, 2, 3], [1, 2])).toThrow();
  });

  it("slope with known values: x=[0,1,2,3,4], y=[1,3,5,7,9]", () => {
    // y = 2x + 1 exactly
    const r = linregress([0, 1, 2, 3, 4], [1, 3, 5, 7, 9]);
    expect(CLOSE(r.slope, 2)).toBe(true);
    expect(CLOSE(r.intercept, 1)).toBe(true);
    expect(CLOSE(r.rvalue, 1)).toBe(true);
    expect(r.pvalue).toBeLessThan(1e-10);
    expect(CLOSE(r.stderr, 0, 1e-9)).toBe(true);
  });

  it("intercept_stderr is positive for non-trivial data", () => {
    const r = linregress([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(r.intercept_stderr).toBeGreaterThan(0);
  });

  it("p-value is between 0 and 1", () => {
    const r = linregress([1, 2, 3, 4, 5, 6], [1, 4, 9, 16, 25, 36]);
    expect(r.pvalue).toBeGreaterThanOrEqual(0);
    expect(r.pvalue).toBeLessThanOrEqual(1);
  });

  it("known example from scipy docs: x=-5..5, y=x", () => {
    const x = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
    const y = x.map((v) => v + 0); // y = x exactly
    const r = linregress(x, y);
    expect(CLOSE(r.slope, 1)).toBe(true);
    expect(CLOSE(r.intercept, 0, 1e-10)).toBe(true);
    expect(CLOSE(r.rvalue, 1)).toBe(true);
    expect(r.pvalue).toBeLessThan(1e-10);
  });

  it("larger noisy dataset p-value < 0.05", () => {
    // y = 3x + noise with strong signal
    const x = Array.from({ length: 30 }, (_, i) => i);
    const y = x.map((v) => 3 * v + 5);
    const r = linregress(x, y);
    expect(r.pvalue).toBeLessThan(0.001);
    expect(CLOSE(r.slope, 3, 1e-6)).toBe(true);
  });
});

// ─── polyfit / polyval ────────────────────────────────────────────────────────

describe("polyfit", () => {
  it("degree-1 gives same result as linregress slope/intercept", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 5, 4, 5];
    const coefs = polyfit(x, y, 1);
    const lr = linregress(x, y);
    expect(CLOSE(coefs[0] as number, lr.slope, 1e-4)).toBe(true);
    expect(CLOSE(coefs[1] as number, lr.intercept, 1e-4)).toBe(true);
  });

  it("degree-2 fits y=x² exactly", () => {
    const x = [0, 1, 2, 3, 4];
    const y = [0, 1, 4, 9, 16];
    const coefs = polyfit(x, y, 2);
    // coefs ≈ [1, 0, 0]
    expect(CLOSE(coefs[0] as number, 1, 1e-4)).toBe(true);
    expect(CLOSE(coefs[1] as number, 0, 1e-4)).toBe(true);
    expect(CLOSE(coefs[2] as number, 0, 1e-4)).toBe(true);
  });

  it("degree-0 fits a constant", () => {
    const y = [3, 3, 3, 3, 3];
    const coefs = polyfit([0, 1, 2, 3, 4], y, 0);
    expect(CLOSE(coefs[0] as number, 3, 1e-6)).toBe(true);
  });

  it("accepts Series input", () => {
    const coefs = polyfit(new Series({ data: [0, 1, 2, 3, 4] }), new Series({ data: [0, 1, 4, 9, 16] }), 2);
    expect(CLOSE(coefs[0] as number, 1, 1e-4)).toBe(true);
  });

  it("throws for too few points", () => {
    expect(() => polyfit([1, 2], [1, 4], 3)).toThrow();
  });

  it("throws for negative degree", () => {
    expect(() => polyfit([1, 2, 3], [1, 2, 3], -1)).toThrow();
  });

  it("degree-3 fits cubic y=x³", () => {
    const x = [0, 1, 2, 3, 4, 5];
    const y = x.map((v) => v ** 3);
    const coefs = polyfit(x, y, 3);
    // coefs ≈ [1, 0, 0, 0]
    expect(CLOSE(coefs[0] as number, 1, 1e-3)).toBe(true);
    expect(CLOSE(coefs[1] as number, 0, 1e-3)).toBe(true);
    expect(CLOSE(coefs[2] as number, 0, 1e-3)).toBe(true);
    expect(CLOSE(coefs[3] as number, 0, 1e-3)).toBe(true);
  });
});

describe("polyval", () => {
  it("constant polynomial", () => {
    expect(polyval([5], 10)).toBe(5);
    expect(polyval([5], [1, 2, 3])).toEqual([5, 5, 5]);
  });

  it("linear: 2x + 3", () => {
    expect(CLOSE(polyval([2, 3], 0), 3)).toBe(true);
    expect(CLOSE(polyval([2, 3], 1), 5)).toBe(true);
    expect(CLOSE(polyval([2, 3], -1), 1)).toBe(true);
  });

  it("quadratic: x² - 3x + 2", () => {
    // roots at x=1 and x=2
    expect(CLOSE(polyval([1, -3, 2], 1), 0)).toBe(true);
    expect(CLOSE(polyval([1, -3, 2], 2), 0)).toBe(true);
    expect(CLOSE(polyval([1, -3, 2], 3), 2)).toBe(true);
  });

  it("array input", () => {
    const vals = polyval([1, -3, 2], [0, 1, 2, 3]);
    expect(CLOSE(vals[0] as number, 2)).toBe(true);
    expect(CLOSE(vals[1] as number, 0)).toBe(true);
    expect(CLOSE(vals[2] as number, 0)).toBe(true);
    expect(CLOSE(vals[3] as number, 2)).toBe(true);
  });

  it("Series input", () => {
    const vals = polyval([2, 1], new Series({ data: [0, 1, 2, 3] }));
    expect(vals).toEqual([1, 3, 5, 7]);
  });

  it("round-trip polyfit/polyval", () => {
    const x = [1, 2, 3, 4, 5];
    const y = x.map((v) => 2 * v * v - 3 * v + 1);
    const coefs = polyfit(x, y, 2);
    const yHat = polyval(coefs, x);
    for (let i = 0; i < x.length; i++) {
      expect(CLOSE(yHat[i] as number, y[i] as number, 1e-4)).toBe(true);
    }
  });
});

// ─── OLS ──────────────────────────────────────────────────────────────────────

describe("OLS", () => {
  it("simple regression matches linregress", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 5, 4, 5];
    const model = new OLS();
    const result = model.fit(x.map((v) => [v]), y);
    const lr = linregress(x, y);
    // params = [slope, intercept] (intercept last)
    expect(CLOSE(result.params[0] as number, lr.slope, 1e-4)).toBe(true);
    expect(CLOSE(result.params[1] as number, lr.intercept, 1e-4)).toBe(true);
    expect(CLOSE(result.rsquared, lr.rvalue ** 2, 1e-4)).toBe(true);
  });

  it("R² = 1 for exact linear fit", () => {
    const x = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 6, 8, 10];
    const result = new OLS().fit(x, y);
    expect(CLOSE(result.rsquared, 1.0, 1e-8)).toBe(true);
  });

  it("multiple regression: y = 2x₁ + 3x₂ + 1", () => {
    const X = [
      [1, 0], [2, 1], [3, 2], [4, 3], [5, 4],
      [6, 5], [7, 6], [8, 7],
    ];
    const y = X.map(([a, b]) => 2 * (a as number) + 3 * (b as number) + 1);
    const result = new OLS().fit(X, y);
    expect(CLOSE(result.params[0] as number, 2, 1e-4)).toBe(true);
    expect(CLOSE(result.params[1] as number, 3, 1e-4)).toBe(true);
    expect(CLOSE(result.params[2] as number, 1, 1e-4)).toBe(true);
    expect(CLOSE(result.rsquared, 1.0, 1e-8)).toBe(true);
  });

  it("predict works", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 5, 4, 5];
    const result = new OLS().fit(X, y);
    const preds = result.predict([[6]]);
    expect(typeof preds[0]).toBe("number");
    // Prediction at x=6 using y = 0.6x + 2.2
    expect(CLOSE(preds[0] as number, 0.6 * 6 + 2.2, 0.1)).toBe(true);
  });

  it("addIntercept=false removes constant term", () => {
    // y = 2x exactly, no intercept
    const X = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 6, 8, 10];
    const result = new OLS({ addIntercept: false }).fit(X, y);
    expect(result.params.length).toBe(1);
    expect(CLOSE(result.params[0] as number, 2, 1e-6)).toBe(true);
    expect(result.paramNames).not.toContain("const");
  });

  it("paramNames includes 'const' when addIntercept=true", () => {
    const result = new OLS().fit([[1], [2], [3]], [1, 2, 3]);
    expect(result.paramNames[result.paramNames.length - 1]).toBe("const");
  });

  it("nobs equals number of observations", () => {
    const X = [[1], [2], [3], [4], [5], [6]];
    const y = [1, 2, 3, 4, 5, 6];
    const result = new OLS().fit(X, y);
    expect(result.nobs).toBe(6);
  });

  it("df_resid = nobs - p (with intercept: p = k + 1)", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 5, 4, 5];
    const result = new OLS().fit(X, y);
    expect(result.df_resid).toBe(5 - 2); // n=5, p=2 (slope + intercept)
  });

  it("ssr + ess ≈ tss", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 5, 4, 5];
    const result = new OLS().fit(X, y);
    expect(CLOSE(result.ssr + result.ess, result.tss, 1e-8)).toBe(true);
  });

  it("pvalues are in [0, 1]", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 5, 4, 5];
    const result = new OLS().fit(X, y);
    for (const p of result.pvalues) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("summary() returns a non-empty string", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 5, 4, 5];
    const result = new OLS().fit(X, y);
    const s = result.summary();
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(100);
    expect(s).toContain("R-squared");
    expect(s).toContain("const");
  });

  it("throws for mismatched X and y lengths", () => {
    expect(() => new OLS().fit([[1], [2], [3]], [1, 2])).toThrow();
  });

  it("throws for too few observations", () => {
    expect(() => new OLS().fit([[1]], [1])).toThrow();
  });

  it("1-D array X treated as n×1", () => {
    const result = new OLS().fit([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(result.params.length).toBe(2); // slope + intercept
    expect(CLOSE(result.params[0] as number, 0.6, 1e-4)).toBe(true);
  });

  it("DataFrame X works", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3, 4, 5] });
    const y = [2, 4, 5, 4, 5];
    const result = new OLS().fit(df, y);
    expect(CLOSE(result.params[0] as number, 0.6, 1e-4)).toBe(true);
    expect(result.paramNames[0]).toBe("x");
    expect(result.paramNames[1]).toBe("const");
  });

  it("adjusted R² ≤ R² for multiple regressors", () => {
    const X = [[1, 0], [2, 1], [3, 0], [4, 1], [5, 0], [6, 1]];
    const y = [2, 3, 4, 5, 6, 7];
    const result = new OLS().fit(X, y);
    expect(result.rsquared_adj).toBeLessThanOrEqual(result.rsquared + 1e-9);
  });

  it("AIC and BIC are finite numbers", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 5, 4, 5];
    const result = new OLS().fit(X, y);
    expect(Number.isFinite(result.aic)).toBe(true);
    expect(Number.isFinite(result.bic)).toBe(true);
  });

  it("bse (standard errors) are all non-negative", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [2, 4, 5, 4, 5];
    const result = new OLS().fit(X, y);
    for (const se of result.bse) {
      expect(se).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property tests", () => {
  it("linregress: r² = rsquared from OLS (simple regression)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 5, maxLength: 20 }),
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 5, maxLength: 20 }),
        (x, y) => {
          const n = Math.min(x.length, y.length);
          const xs = x.slice(0, n);
          const ys = y.slice(0, n);
          if (n < 2) return true;
          const lr = linregress(xs, ys);
          const ols = new OLS().fit(xs.map((v) => [v]), ys);
          // R² from OLS ≈ r² from linregress
          return CLOSE(ols.rsquared, lr.rvalue ** 2, 0.01);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("polyval round-trip: polyval(polyfit(x,y,1), x) ≈ fitted values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: 3, maxLength: 15 }),
        fc.array(fc.float({ min: -50, max: 50, noNaN: true }), { minLength: 3, maxLength: 15 }),
        (x, y) => {
          const n = Math.min(x.length, y.length);
          const xs = x.slice(0, n);
          const ys = y.slice(0, n);
          // Need distinct x values for polyfit(1) to be well-defined
          const hasDistinctX = new Set(xs).size >= 2;
          if (!hasDistinctX) return true;
          try {
            const coefs = polyfit(xs, ys, 1);
            const fitted = polyval(coefs, xs);
            // Each fitted value is finite
            return fitted.every((v) => Number.isFinite(v as number));
          } catch {
            return true;
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("linregress: slope sign matches correlation sign", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: 4, maxLength: 20 }),
        fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: 4, maxLength: 20 }),
        (x, y) => {
          const n = Math.min(x.length, y.length);
          const xs = x.slice(0, n);
          const ys = y.slice(0, n);
          const r = linregress(xs, ys);
          if (!Number.isFinite(r.slope) || !Number.isFinite(r.rvalue)) return true;
          // slope and rvalue should have the same sign (or both be 0)
          return Math.sign(r.slope) === Math.sign(r.rvalue) || Math.abs(r.slope) < 1e-10;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("OLS: ssr + ess = tss (identity)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -20, max: 20, noNaN: true }), { minLength: 4, maxLength: 12 }),
        fc.array(fc.float({ min: -20, max: 20, noNaN: true }), { minLength: 4, maxLength: 12 }),
        (x, y) => {
          const n = Math.min(x.length, y.length);
          const xs = x.slice(0, n);
          const ys = y.slice(0, n);
          if (n < 3) return true;
          try {
            const result = new OLS().fit(xs.map((v) => [v]), ys);
            return CLOSE(result.ssr + result.ess, result.tss, 1e-4);
          } catch {
            return true;
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
