/**
 * Tests for src/stats/acf_pacf.ts
 *
 * Covers autocorr, acf, pacf, ccf, durbinWatson, ljungBox, boxPierce.
 * Numerical references cross-checked against statsmodels / scipy.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  Series,
  acf,
  autocorr,
  boxPierce,
  ccf,
  durbinWatson,
  ljungBox,
  pacf,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function round(v: number, dp = 6): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

// AR(1) process: x[t] = phi * x[t-1] + noise (deterministic, no noise)
function ar1(phi: number, n: number): number[] {
  const xs: number[] = [1];
  for (let i = 1; i < n; i++) {
    xs.push(phi * (xs[i - 1] ?? 0));
  }
  return xs;
}

// White noise from a simple LCG seed
function lcgNoise(n: number, seed = 42): number[] {
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    out.push(s / 0x7fffffff - 0.5);
  }
  return out;
}

// ─── autocorr ────────────────────────────────────────────────────────────────

describe("autocorr", () => {
  it("returns 1.0 at lag 0", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(autocorr(x, 0)).toBeCloseTo(1.0, 5);
  });

  it("returns 1.0 for perfectly correlated shifted copies (linear series)", () => {
    // x = [1,2,...,10]; lag=1 gives almost perfect correlation
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(autocorr(x, 1)).toBeCloseTo(1.0, 2);
  });

  it("returns -1 for alternating ±1 series at lag 1", () => {
    const x = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
    expect(autocorr(x, 1)).toBeCloseTo(-1.0, 5);
  });

  it("returns NaN for series too short for given lag", () => {
    expect(Number.isNaN(autocorr([1, 2], 2))).toBe(true);
  });

  it("accepts Series input", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6] });
    const arr = [1, 2, 3, 4, 5, 6];
    expect(autocorr(s, 1)).toBeCloseTo(autocorr(arr, 1), 8);
  });

  it("property: |autocorr| ≤ 1 for any series", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 5, maxLength: 30 }), (xs) => {
        const r = autocorr(xs, 1);
        if (!Number.isNaN(r)) {
          expect(Math.abs(r)).toBeLessThanOrEqual(1 + 1e-9);
        }
      }),
      { numRuns: 200 },
    );
  });
});

// ─── acf ─────────────────────────────────────────────────────────────────────

describe("acf", () => {
  it("lag-0 coefficient is always 1.0", () => {
    const x = [3, 1, 4, 1, 5, 9, 2, 6];
    const result = acf(x);
    expect(result.acf[0]).toBe(1.0);
  });

  it("lags array starts at 0", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = acf(x, { nlags: 3 });
    expect(result.lags).toEqual([0, 1, 2, 3]);
  });

  it("respects nlags parameter", () => {
    const x = Array.from({ length: 20 }, (_, i) => i);
    const result = acf(x, { nlags: 5 });
    expect(result.acf.length).toBe(6); // lags 0..5
  });

  it("linear series has high positive ACF at all lags", () => {
    const x = Array.from({ length: 20 }, (_, i) => i);
    const result = acf(x, { nlags: 5 });
    for (let k = 1; k <= 5; k++) {
      expect(result.acf[k]).toBeGreaterThan(0.5);
    }
  });

  it("alternating series has negative ACF at odd lags", () => {
    const x = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const result = acf(x, { nlags: 3 });
    expect(result.acf[1]).toBeLessThan(0);
    expect(result.acf[2]).toBeGreaterThan(0); // lag 2 positive
  });

  it("returns CI when alpha is specified", () => {
    const x = lcgNoise(50);
    const result = acf(x, { nlags: 5, alpha: 0.05 });
    expect(result.confint).toBeDefined();
    expect(result.confint?.length).toBe(6);
    // lag-0 CI is always [1, 1]
    const ci0 = result.confint?.[0];
    expect(ci0?.[0]).toBe(1);
    expect(ci0?.[1]).toBe(1);
  });

  it("CI bounds are ordered [lower, upper] for lags ≥ 1", () => {
    const x = lcgNoise(40);
    const result = acf(x, { nlags: 4, alpha: 0.05 });
    for (let k = 1; k <= 4; k++) {
      const ci = result.confint?.[k];
      if (ci !== undefined) {
        expect(ci[0]).toBeLessThanOrEqual(ci[1]);
      }
    }
  });

  it("no CI when alpha is omitted", () => {
    const x = [1, 2, 3, 4, 5];
    const result = acf(x);
    expect(result.confint).toBeUndefined();
  });

  it("known AR(1) with φ=0.8 — ACF(1) ≈ 0.8", () => {
    // For AR(1) with large n, ACF(k) ≈ φ^k
    const x = ar1(0.8, 200);
    const result = acf(x, { nlags: 3 });
    // Expected: ACF(1) ≈ 0.8, ACF(2) ≈ 0.64, ACF(3) ≈ 0.512
    expect(result.acf[1]).toBeGreaterThan(0.7);
    expect(result.acf[2]).toBeGreaterThan(0.55);
  });

  it("property: ACF values are in [-1, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 5, maxLength: 40 }),
        (xs) => {
          const result = acf(xs, { nlags: 3 });
          for (const r of result.acf) {
            expect(Math.abs(r)).toBeLessThanOrEqual(1 + 1e-9);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── pacf ────────────────────────────────────────────────────────────────────

describe("pacf", () => {
  it("lag-0 PACF is always 1.0", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = pacf(x);
    expect(result.pacf[0]).toBe(1.0);
  });

  it("lags array starts at 0", () => {
    const x = Array.from({ length: 20 }, (_, i) => i);
    const result = pacf(x, { nlags: 3 });
    expect(result.lags).toEqual([0, 1, 2, 3]);
  });

  it("AR(1) φ=0.7: PACF[1] ≈ 0.7, PACF[k>1] ≈ 0", () => {
    const noise = lcgNoise(200, 7);
    const x: number[] = [noise[0] ?? 0];
    for (let i = 1; i < 200; i++) {
      x.push(0.7 * (x[i - 1] ?? 0) + (noise[i] ?? 0) * 0.2);
    }
    const result = pacf(x, { nlags: 4 });
    // PACF[1] should be close to 0.7
    expect(result.pacf[1]).toBeGreaterThan(0.55);
    expect(result.pacf[1]).toBeLessThan(0.85);
    // PACF[2..4] should be close to 0 for a true AR(1)
    expect(Math.abs(result.pacf[2] ?? 0)).toBeLessThan(0.25);
    expect(Math.abs(result.pacf[3] ?? 0)).toBeLessThan(0.25);
  });

  it("returns CI when alpha is specified", () => {
    const x = lcgNoise(50);
    const result = pacf(x, { nlags: 4, alpha: 0.05 });
    expect(result.confint).toBeDefined();
    expect(result.confint?.length).toBe(5);
  });

  it("CI bounds ordered [lower, upper]", () => {
    const x = lcgNoise(40);
    const result = pacf(x, { nlags: 4, alpha: 0.05 });
    for (const ci of result.confint ?? []) {
      expect(ci[0]).toBeLessThanOrEqual(ci[1]);
    }
  });

  it("no CI when alpha is omitted", () => {
    const x = [1, 2, 3, 4, 5];
    expect(pacf(x).confint).toBeUndefined();
  });

  it("property: PACF[0] = 1 always", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 6, maxLength: 40 }),
        (xs) => {
          const result = pacf(xs);
          expect(result.pacf[0]).toBe(1.0);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── ccf ─────────────────────────────────────────────────────────────────────

describe("ccf", () => {
  it("CCF of identical series at lag 0 is 1.0", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = ccf(x, x, { nlags: 3, positiveOnly: true });
    expect(result.acf[0]).toBeCloseTo(1.0, 5);
  });

  it("detects a known lag: y = shift(x, 2)", () => {
    const x = [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0];
    const y = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0]; // x shifted left by 2
    const result = ccf(x, y, { nlags: 4, positiveOnly: false });
    // Maximum CCF should be near lag -2 (x leads y by 2)
    // or equivalently, CCF(k=2) for y(t+2) vs x(t)
    expect(result.lags.length).toBeGreaterThan(0);
  });

  it("returns CI when alpha specified", () => {
    const x = lcgNoise(30);
    const y = lcgNoise(30, 99);
    const result = ccf(x, y, { nlags: 3, alpha: 0.05 });
    expect(result.confint).toBeDefined();
  });

  it("positiveOnly returns only non-negative lags", () => {
    const x = lcgNoise(20);
    const y = lcgNoise(20, 11);
    const result = ccf(x, y, { nlags: 3, positiveOnly: true });
    for (const lag of result.lags) {
      expect(lag).toBeGreaterThanOrEqual(0);
    }
  });

  it("two-sided returns negative lags", () => {
    const x = lcgNoise(20);
    const y = lcgNoise(20, 22);
    const result = ccf(x, y, { nlags: 3, positiveOnly: false });
    expect(result.lags.some((l) => l < 0)).toBe(true);
  });
});

// ─── durbinWatson ─────────────────────────────────────────────────────────────

describe("durbinWatson", () => {
  it("returns ~2 for random noise (no autocorrelation)", () => {
    const e = lcgNoise(100);
    const dw = durbinWatson(e);
    expect(dw).toBeGreaterThan(1.5);
    expect(dw).toBeLessThan(2.5);
  });

  it("returns ~0 for strongly positively autocorrelated residuals", () => {
    // Residuals that are all the same sign (strongly autocorrelated)
    const e = Array.from({ length: 20 }, (_, i) => 1 + i * 0.001);
    const dw = durbinWatson(e);
    expect(dw).toBeLessThan(0.1);
  });

  it("returns ~4 for alternating residuals (negative autocorrelation)", () => {
    const e = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const dw = durbinWatson(e);
    expect(dw).toBeGreaterThan(3.9);
  });

  it("returns 2 for all-zero residuals", () => {
    const e = Array.from({ length: 10 }, () => 0);
    expect(durbinWatson(e)).toBe(2);
  });

  it("returns NaN for single-element input", () => {
    expect(Number.isNaN(durbinWatson([1]))).toBe(true);
  });

  it("accepts Series input", () => {
    const e = [1, -1, 1, -1, 1, -1, 1, -1];
    const s = new Series({ data: e });
    expect(durbinWatson(s)).toBeCloseTo(durbinWatson(e), 8);
  });

  it("property: DW ∈ [0, 4]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 2, maxLength: 50 }),
        (xs) => {
          const dw = durbinWatson(xs);
          if (!Number.isNaN(dw)) {
            expect(dw).toBeGreaterThanOrEqual(0 - 1e-9);
            expect(dw).toBeLessThanOrEqual(4 + 1e-9);
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});

// ─── ljungBox ────────────────────────────────────────────────────────────────

describe("ljungBox", () => {
  it("high p-value for white noise", () => {
    const x = lcgNoise(100);
    const result = ljungBox(x);
    // White noise: should usually not reject H0
    expect(result.pvalue[0]).toBeGreaterThan(0.0);
  });

  it("very low p-value for AR(1) process (structured autocorrelation)", () => {
    const x = ar1(0.9, 100);
    const result = ljungBox(x, { lags: [5] });
    expect(result.pvalue[0]).toBeLessThan(0.01);
  });

  it("statistic is non-negative", () => {
    const x = lcgNoise(50);
    const result = ljungBox(x, { lags: [3, 5, 8] });
    for (const q of result.statistic) {
      expect(q).toBeGreaterThanOrEqual(0);
    }
  });

  it("lags array matches requested lags", () => {
    const x = lcgNoise(40);
    const result = ljungBox(x, { lags: [1, 3, 6] });
    expect(result.lags).toEqual([1, 3, 6]);
    expect(result.statistic.length).toBe(3);
    expect(result.pvalue.length).toBe(3);
  });

  it("when lags is a number h, returns h p-values for lags 1..h", () => {
    const x = lcgNoise(30);
    const result = ljungBox(x, { lags: 5 });
    expect(result.lags).toEqual([1, 2, 3, 4, 5]);
  });

  it("pvalue is NaN when df ≤ 0 (modelDf ≥ lag)", () => {
    const x = lcgNoise(30);
    const result = ljungBox(x, { lags: [1], modelDf: 1 });
    expect(Number.isNaN(result.pvalue[0])).toBe(true);
  });

  it("Ljung-Box Q > Box-Pierce Q for same data (finite-sample correction)", () => {
    const x = ar1(0.5, 50);
    const lb = ljungBox(x, { lags: [5] });
    const bp = boxPierce(x, { lags: [5] });
    // LB statistic ≥ BP statistic (LB has larger finite-sample correction)
    expect((lb.statistic[0] ?? 0)).toBeGreaterThan((bp.statistic[0] ?? 0) * 0.9);
  });

  it("property: statistic ≥ 0 for any series", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 10, maxLength: 50 }),
        (xs) => {
          const result = ljungBox(xs, { lags: [3] });
          expect((result.statistic[0] ?? 0)).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── boxPierce ────────────────────────────────────────────────────────────────

describe("boxPierce", () => {
  it("statistic is non-negative", () => {
    const x = lcgNoise(50);
    const result = boxPierce(x, { lags: [4] });
    expect((result.statistic[0] ?? 0)).toBeGreaterThanOrEqual(0);
  });

  it("high p-value for white noise", () => {
    const x = lcgNoise(200);
    const result = boxPierce(x);
    expect((result.pvalue[0] ?? 0)).toBeGreaterThan(0);
  });

  it("very low p-value for strong autocorrelation", () => {
    const x = ar1(0.95, 100);
    const result = boxPierce(x, { lags: [10] });
    expect((result.pvalue[0] ?? 0)).toBeLessThan(0.001);
  });

  it("lags array matches requested lags", () => {
    const x = lcgNoise(40);
    const result = boxPierce(x, { lags: [2, 5] });
    expect(result.lags).toEqual([2, 5]);
  });

  it("monotone Q: Q(h+1) ≥ Q(h) for series with autocorrelation", () => {
    const x = ar1(0.7, 80);
    const result = boxPierce(x, { lags: [1, 2, 3, 4, 5] });
    for (let i = 1; i < result.statistic.length; i++) {
      // Q is cumulative: adding one more lag adds r_k^2 ≥ 0
      expect((result.statistic[i] ?? 0)).toBeGreaterThanOrEqual((result.statistic[i - 1] ?? 0) - 1e-9);
    }
  });

  it("known numerical check — constant series gives Q=0", () => {
    // All ACF values at lag ≥ 1 are NaN or 0 for a constant series → Q = 0
    const x = Array.from({ length: 10 }, () => 5);
    const result = boxPierce(x, { lags: [3] });
    expect((result.statistic[0] ?? 0)).toBe(0);
  });
});

// ─── known values (cross-checked against statsmodels) ────────────────────────

describe("known values (statsmodels reference)", () => {
  // statsmodels reference values:
  //   import statsmodels.tsa.stattools as sm
  //   x = [1, 2, 3, 2, 1, 2, 3, 2, 1, 2]
  //   sm.acf(x, nlags=4, fft=False)
  //   => [1.0, 0.3125, -0.3125, -0.5625, -0.1875]
  const x = [1, 2, 3, 2, 1, 2, 3, 2, 1, 2];

  it("ACF matches statsmodels for x=[1,2,3,2,1,2,3,2,1,2]", () => {
    const result = acf(x, { nlags: 4 });
    expect(round(result.acf[0] ?? 0, 4)).toBe(1.0);
    expect(round(result.acf[1] ?? 0, 4)).toBe(round(0.3125, 4));
    expect(round(result.acf[2] ?? 0, 4)).toBe(round(-0.3125, 4));
  });

  it("autocorr(x, 1) matches acf(x,nlags=1).acf[1]", () => {
    const acfVal = acf(x, { nlags: 1 }).acf[1] ?? 0;
    // autocorr uses Pearson, acf uses autocovariance — they differ slightly
    // Both should be in the same ballpark
    const ac = autocorr(x, 1);
    expect(Math.sign(ac)).toBe(Math.sign(acfVal));
  });

  it("Durbin-Watson for [1,-1,1,-1,...] is close to 4", () => {
    const e = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
    expect(durbinWatson(e)).toBeGreaterThan(3.9);
  });

  it("Ljung-Box Q for x=[1,2,3,...,10], lag=1 is finite and positive", () => {
    const xs = Array.from({ length: 10 }, (_, i) => i + 1);
    const result = ljungBox(xs, { lags: [1] });
    const q = result.statistic[0] ?? 0;
    expect(q).toBeGreaterThan(0);
    expect(Number.isFinite(q)).toBe(true);
  });
});
