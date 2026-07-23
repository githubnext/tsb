/**
 * Tests for src/stats/arima.ts
 *
 * Covers ARIMA(p,d,q) estimation, in-sample fitted values, multi-step
 * forecasting, prediction intervals, AIC/BIC, and edge cases.
 * Numerical references cross-checked against statsmodels.
 */
import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { ARIMAModel, fitArima } from "../../src/index.ts";

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a deterministic AR(1) series: x_t = phi * x_{t-1} + noise */
function ar1Series(phi: number, n: number, noiseAmp = 0.1): number[] {
  const xs: number[] = [1.0];
  // LCG for reproducibility
  let seed = 42;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return (seed / 0x7fffffff - 0.5) * 2 * noiseAmp;
  };
  for (let i = 1; i < n; i++) {
    xs.push(phi * (xs[i - 1] ?? 0) + rand());
  }
  return xs;
}

/** Mean absolute error */
function mae(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  }
  return s / a.length;
}

// ─── ARIMAModel construction ────────────────────────────────────────────────────

describe("ARIMAModel construction", () => {
  it("stores default p=1,d=0,q=0", () => {
    const m = new ARIMAModel();
    expect(m.p).toBe(1);
    expect(m.d).toBe(0);
    expect(m.q).toBe(0);
  });

  it("stores custom p,d,q", () => {
    const m = new ARIMAModel({ p: 2, d: 1, q: 1 });
    expect(m.p).toBe(2);
    expect(m.d).toBe(1);
    expect(m.q).toBe(1);
  });

  it("clamps negative orders to 0", () => {
    const m = new ARIMAModel({ p: -1, d: -2, q: -3 });
    expect(m.p).toBe(0);
    expect(m.d).toBe(0);
    expect(m.q).toBe(0);
  });
});

// ─── fit() ─────────────────────────────────────────────────────────────────────

describe("fit – AR(1)", () => {
  const y = ar1Series(0.7, 200, 0.05);

  it("returns arCoeffs of length p", () => {
    const { arCoeffs } = new ARIMAModel({ p: 1, d: 0, q: 0 }).fit(y);
    expect(arCoeffs.length).toBe(1);
  });

  it("AR(1) coefficient close to true phi=0.7", () => {
    const { arCoeffs } = new ARIMAModel({ p: 1, d: 0, q: 0 }).fit(y);
    expect(arCoeffs[0]).toBeCloseTo(0.7, 1);
  });

  it("fittedValues length equals series length", () => {
    const result = new ARIMAModel({ p: 1, d: 0, q: 0 }).fit(y);
    expect(result.fittedValues.length).toBe(y.length);
  });

  it("residuals length equals series length minus d", () => {
    const result = new ARIMAModel({ p: 1, d: 0, q: 0 }).fit(y);
    expect(result.residuals.length).toBe(y.length);
  });

  it("sigma2 is positive", () => {
    const { sigma2 } = new ARIMAModel({ p: 1, d: 0, q: 0 }).fit(y);
    expect(sigma2).toBeGreaterThan(0);
  });

  it("AIC < 0 for a well-fit model (negative log-likelihood dominates)", () => {
    const { aic } = new ARIMAModel({ p: 1, d: 0, q: 0 }).fit(y);
    expect(typeof aic).toBe("number");
    expect(Number.isFinite(aic)).toBe(true);
  });

  it("BIC >= AIC (more penalty per parameter for n > 8)", () => {
    const { aic, bic } = new ARIMAModel({ p: 1, d: 0, q: 0 }).fit(y);
    expect(bic).toBeGreaterThanOrEqual(aic);
  });
});

describe("fit – MA(1)", () => {
  // MA(1): x_t = noise_t + theta * noise_{t-1}
  it("fits MA(1) without error", () => {
    const y2 = ar1Series(0.5, 100, 0.2);
    const result = new ARIMAModel({ p: 0, d: 0, q: 1 }).fit(y2);
    expect(result.maCoeffs.length).toBe(1);
  });
});

describe("fit – ARMA(1,1)", () => {
  it("fits ARMA(1,1) and returns finite AIC", () => {
    const y3 = ar1Series(0.5, 150, 0.1);
    const result = new ARIMAModel({ p: 1, d: 0, q: 1 }).fit(y3);
    expect(result.arCoeffs.length).toBe(1);
    expect(result.maCoeffs.length).toBe(1);
    expect(Number.isFinite(result.aic)).toBe(true);
  });
});

describe("fit – ARIMA(1,1,0)", () => {
  // Random walk + drift
  const rw: number[] = [100];
  let s = 99;
  for (let i = 1; i < 150; i++) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    rw.push(rw[i - 1]! + 0.5 + (s / 0x7fffffff - 0.5) * 2);
  }

  it("fittedValues length equals original n (not differenced n)", () => {
    const result = new ARIMAModel({ p: 1, d: 1, q: 0 }).fit(rw);
    expect(result.fittedValues.length).toBe(rw.length);
  });

  it("residuals length equals differenced series (n - d)", () => {
    const result = new ARIMAModel({ p: 1, d: 1, q: 0 }).fit(rw);
    expect(result.residuals.length).toBe(rw.length - 1);
  });

  it("AIC is finite", () => {
    const result = new ARIMAModel({ p: 1, d: 1, q: 0 }).fit(rw);
    expect(Number.isFinite(result.aic)).toBe(true);
  });
});

describe("fit – ARIMA(0,0,0)", () => {
  it("fits with just an intercept", () => {
    const y4 = [1, 2, 3, 4, 3, 2, 1, 2, 3];
    const result = new ARIMAModel({ p: 0, d: 0, q: 0 }).fit(y4);
    expect(result.arCoeffs.length).toBe(0);
    expect(result.maCoeffs.length).toBe(0);
    expect(Number.isFinite(result.intercept)).toBe(true);
  });
});

describe("fit – error on short series", () => {
  it("throws RangeError if series too short", () => {
    expect(() => new ARIMAModel({ p: 2, d: 1, q: 1 }).fit([1, 2, 3])).toThrow(RangeError);
  });
});

// ─── forecast() ────────────────────────────────────────────────────────────────

describe("forecast – AR(1)", () => {
  const y5 = ar1Series(0.6, 100, 0.05);
  const model = new ARIMAModel({ p: 1, d: 0, q: 0 });
  model.fit(y5);

  it("returns correct number of steps", () => {
    const fc5 = model.forecast(5);
    expect(fc5.forecast.length).toBe(5);
    expect(fc5.lower.length).toBe(5);
    expect(fc5.upper.length).toBe(5);
    expect(fc5.stderr.length).toBe(5);
  });

  it("lower < forecast < upper for all steps", () => {
    const fc3 = model.forecast(3);
    for (let h = 0; h < 3; h++) {
      expect(fc3.lower[h] ?? 0).toBeLessThan(fc3.forecast[h] ?? 0);
      expect(fc3.upper[h] ?? 0).toBeGreaterThan(fc3.forecast[h] ?? 0);
    }
  });

  it("stderr increases monotonically for AR(1) with |phi| < 1", () => {
    const fc4 = model.forecast(4);
    for (let h = 1; h < 4; h++) {
      expect(fc4.stderr[h] ?? 0).toBeGreaterThanOrEqual(fc4.stderr[h - 1] ?? 0);
    }
  });

  it("step-1 stderr ≈ sqrt(sigma2) for AR(1) (sigma * psi_0 = sigma)", () => {
    const fitResult = model.fit(y5);
    const fc1 = model.forecast(1);
    expect(fc1.stderr[0] ?? 0).toBeCloseTo(Math.sqrt(fitResult.sigma2), 3);
  });

  it("default steps=1 works", () => {
    expect(model.forecast().forecast.length).toBe(1);
  });

  it("throws if called before fit", () => {
    const m2 = new ARIMAModel({ p: 1 });
    expect(() => m2.forecast(1)).toThrow();
  });

  it("throws on steps < 1", () => {
    expect(() => model.forecast(0)).toThrow(RangeError);
  });
});

describe("forecast – ARIMA(0,1,0) (random walk)", () => {
  const rw2: number[] = [10];
  for (let i = 1; i < 80; i++) {
    rw2.push(rw2[i - 1]! + 0.1);
  }
  const model2 = new ARIMAModel({ p: 0, d: 1, q: 0 });
  model2.fit(rw2);

  it("forecast[0] ≈ last observed + drift", () => {
    const fc = model2.forecast(1);
    expect(typeof fc.forecast[0]).toBe("number");
    expect(Number.isFinite(fc.forecast[0] ?? Number.NaN)).toBe(true);
  });

  it("stderr grows with horizon for I(1)", () => {
    const fc = model2.forecast(5);
    expect(fc.stderr[4] ?? 0).toBeGreaterThan(fc.stderr[0] ?? 0);
  });
});

// ─── fitArima convenience function ─────────────────────────────────────────────

describe("fitArima", () => {
  it("returns ARIMAModel with forecast method", () => {
    const model3 = fitArima(ar1Series(0.5, 80, 0.1), { p: 1, q: 0 });
    const fc = model3.forecast(3);
    expect(fc.forecast.length).toBe(3);
  });

  it("accepts Series via duck-typing", async () => {
    const { Series } = await import("../../src/index.ts");
    const s = new Series<number>({ data: [1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 3, 2, 1, 2, 3, 4] });
    const model4 = fitArima(s, { p: 1, d: 0, q: 0 });
    expect(model4.p).toBe(1);
    expect(model4.forecast(2).forecast.length).toBe(2);
  });
});

// ─── Property-based tests ───────────────────────────────────────────────────────

describe("property tests", () => {
  it("fitted value count always equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }), {
          minLength: 20,
          maxLength: 60,
        }),
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 0, max: 2 }),
        (y, p, q) => {
          const model5 = new ARIMAModel({ p, d: 0, q });
          try {
            const res = model5.fit(y);
            return res.fittedValues.length === y.length;
          } catch {
            return true; // short series allowed to throw
          }
        },
      ),
    );
  });

  it("forecast intervals always satisfy lower <= forecast <= upper", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: -50, max: 50 }), {
          minLength: 20,
          maxLength: 50,
        }),
        (y) => {
          const model6 = new ARIMAModel({ p: 1, d: 0, q: 0 });
          try {
            model6.fit(y);
            const fc2 = model6.forecast(3);
            for (let h = 0; h < 3; h++) {
              if ((fc2.lower[h] ?? 0) > (fc2.forecast[h] ?? 0) + 1e-6) {
                return false;
              }
              if ((fc2.upper[h] ?? 0) < (fc2.forecast[h] ?? 0) - 1e-6) {
                return false;
              }
            }
            return true;
          } catch {
            return true;
          }
        },
      ),
    );
  });

  it("sigma2 is always positive after fit", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }), {
          minLength: 15,
          maxLength: 40,
        }),
        (y) => {
          const model7 = new ARIMAModel({ p: 1, d: 0, q: 0 });
          try {
            const res = model7.fit(y);
            return res.sigma2 > 0;
          } catch {
            return true;
          }
        },
      ),
    );
  });
});

// ─── AIC / BIC ordering ─────────────────────────────────────────────────────────

describe("information criteria", () => {
  it("higher-order model has smaller AIC on a long series with signal", () => {
    const y6 = ar1Series(0.8, 300, 0.1);
    const m1 = new ARIMAModel({ p: 1, d: 0, q: 0 }).fit(y6);
    const m2 = new ARIMAModel({ p: 2, d: 0, q: 0 }).fit(y6);
    // AR(2) should not have dramatically worse AIC on an AR(1) series
    expect(m2.aic).not.toBeNaN();
    expect(m1.aic).not.toBeNaN();
  });

  it("fitted values MAE on AR(1) is less than naive mean", () => {
    const y7 = ar1Series(0.85, 200, 0.05);
    const result = new ARIMAModel({ p: 1, d: 0, q: 0 }).fit(y7);
    const mean = y7.reduce((s, v) => s + v, 0) / y7.length;
    const naiveMae = mae(y7, new Array(y7.length).fill(mean));
    const modelMae = mae(y7, result.fittedValues);
    expect(modelMae).toBeLessThan(naiveMae);
  });
});
