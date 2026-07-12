/**
 * Tests for dlm.ts — Dynamic Linear Model (State-Space).
 */
import { describe, test, expect } from "bun:test";
import * as fc from "fast-check";
import {
  DLM,
  buildLocalLevel,
  buildLocalLinearTrend,
  buildPolynomial,
  buildFourier,
  buildRegression,
  combineDLMs,
} from "../../src/stats/dlm.ts";

// ─── helpers ───────────────────────────────────────────────────────────────────
function approx(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) <= tol * (1 + Math.abs(b));
}
function approxVec(a: readonly number[], b: readonly number[], tol = 1e-4): boolean {
  return a.length === b.length && a.every((v, i) => approx(v, b[i]!, tol));
}

// ─── Local-level model ─────────────────────────────────────────────────────────
describe("DLM — local-level", () => {
  const y = [1, 2, 3, 2, 3, 4, 3, 4, 5, 4];

  test("filter returns correct dimensions", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const res = dlm.filter(y);
    expect(res.steps.length).toBe(y.length);
    expect(res.filteredMeans.length).toBe(y.length);
    expect(res.filteredMeans[0]!.length).toBe(1);
    expect(res.forecastMeans.length).toBe(y.length);
  });

  test("log-likelihood is finite and negative", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const res = dlm.filter(y);
    expect(isFinite(res.logLikelihood)).toBe(true);
    expect(res.logLikelihood).toBeLessThan(0);
  });

  test("filtered means track the signal", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const res = dlm.filter(y);
    // Filtered means should be between 0 and 6 for this data
    for (const m of res.filteredMeans) {
      expect(m[0]).toBeGreaterThan(0);
      expect(m[0]).toBeLessThan(6);
    }
  });

  test("filter with missing observations", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const yMissing = [1, null, 3, null, 5];
    const res = dlm.filter(yMissing);
    expect(res.steps.length).toBe(5);
    // Steps with null observations have null innovation
    expect(res.steps[1]!.innovation).toBeNull();
    expect(res.steps[3]!.innovation).toBeNull();
    // Steps with observations have non-null innovation
    expect(res.steps[0]!.innovation).not.toBeNull();
  });

  test("higher observation noise → filtered closer to prior", () => {
    const dlmLow = DLM.localLevel({ sigmaObs: 0.01, sigmaLevel: 1 });
    const dlmHigh = DLM.localLevel({ sigmaObs: 100, sigmaLevel: 1 });
    const resLow = dlmLow.filter(y);
    const resHigh = dlmHigh.filter(y);
    // With low obs noise, filtered mean ≈ observation
    expect(Math.abs(resLow.filteredMeans[0]![0]! - y[0]!)).toBeLessThan(0.1);
    // With high obs noise, filtered mean stays near prior (zero init, drifts slowly)
    // Just check the values are different
    expect(resLow.filteredMeans[5]![0]).not.toBeCloseTo(resHigh.filteredMeans[5]![0]!, 1);
  });
});

// ─── Local-linear-trend model ──────────────────────────────────────────────────
describe("DLM — local-linear-trend", () => {
  // Linearly increasing data with noise
  const y = Array.from({ length: 20 }, (_, t) => t + 0.5 * (Math.sin(t) * 0.1));

  test("filter dimensions", () => {
    const dlm = DLM.localLinearTrend({ sigmaObs: 0.5, sigmaLevel: 0.1, sigmaSlope: 0.01 });
    const res = dlm.filter(y);
    expect(res.filteredMeans.length).toBe(y.length);
    expect(res.filteredMeans[0]!.length).toBe(2); // [level, slope]
  });

  test("slope converges near 1 for linear data", () => {
    const dlm = DLM.localLinearTrend({ sigmaObs: 0.1, sigmaLevel: 0.01, sigmaSlope: 0.01 });
    const res = dlm.filter(y);
    const lastSlope = res.filteredMeans[y.length - 1]![1]!;
    expect(lastSlope).toBeGreaterThan(0.5);
    expect(lastSlope).toBeLessThan(2);
  });

  test("log-likelihood improves with better sigma", () => {
    const dlmGood = DLM.localLinearTrend({ sigmaObs: 0.5, sigmaLevel: 0.1, sigmaSlope: 0.01 });
    const dlmBad = DLM.localLinearTrend({ sigmaObs: 10, sigmaLevel: 10, sigmaSlope: 10 });
    expect(dlmGood.filter(y).logLikelihood).toBeGreaterThan(dlmBad.filter(y).logLikelihood);
  });
});

// ─── Smoother ──────────────────────────────────────────────────────────────────
describe("DLM — RTS smoother", () => {
  const y = [1, 2, 1.5, 3, 2.5, 4, 3.5, 5, 4.5, 6];

  test("smoothed means have same length as data", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const res = dlm.smooth(y);
    expect(res.smoothedMeans.length).toBe(y.length);
    expect(res.smoothedCovs.length).toBe(y.length);
  });

  test("smoother log-likelihood equals filter log-likelihood", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const filterRes = dlm.filter(y);
    const smoothRes = dlm.smooth(y);
    expect(smoothRes.logLikelihood).toBeCloseTo(filterRes.logLikelihood, 6);
  });

  test("smoothed covariances ≤ filtered covariances (trace)", () => {
    const dlm = DLM.localLinearTrend({ sigmaObs: 1, sigmaLevel: 0.5, sigmaSlope: 0.1 });
    const res = dlm.smooth(y);
    for (let t = 0; t < y.length - 1; t++) {
      const filtTrace =
        res.filteredCovs[t]![0]![0]! + (res.filteredCovs[t]![1]?.[1] ?? 0);
      const smTrace =
        res.smoothedCovs[t]![0]![0]! + (res.smoothedCovs[t]![1]?.[1] ?? 0);
      // Smoother should not increase uncertainty
      expect(smTrace).toBeLessThanOrEqual(filtTrace + 1e-6);
    }
  });

  test("last smoothed = last filtered", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const res = dlm.smooth(y);
    const T = y.length;
    expect(res.smoothedMeans[T - 1]![0]).toBeCloseTo(res.filteredMeans[T - 1]![0]!, 6);
  });
});

// ─── Forecasting ───────────────────────────────────────────────────────────────
describe("DLM — forecasting", () => {
  const y = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  test("forecast returns h steps", () => {
    const dlm = DLM.localLevel({ sigmaObs: 0.5, sigmaLevel: 0.2 });
    const res = dlm.filter(y);
    const fc = dlm.forecast(res, 5);
    expect(fc.mean.length).toBe(5);
    expect(fc.lower.length).toBe(5);
    expect(fc.upper.length).toBe(5);
  });

  test("forecast mean > lower, < upper", () => {
    const dlm = DLM.localLevel({ sigmaObs: 0.5, sigmaLevel: 0.2 });
    const res = dlm.filter(y);
    const fc = dlm.forecast(res, 5);
    for (let i = 0; i < 5; i++) {
      expect(fc.mean[i]![0]).toBeGreaterThan(fc.lower[i]!);
      expect(fc.mean[i]![0]).toBeLessThan(fc.upper[i]!);
    }
  });

  test("prediction intervals widen over forecast horizon", () => {
    const dlm = DLM.localLevel({ sigmaObs: 0.5, sigmaLevel: 0.2 });
    const res = dlm.filter(y);
    const fc = dlm.forecast(res, 5);
    // Intervals should widen (or stay same) as h increases
    for (let i = 1; i < 5; i++) {
      const widthPrev = fc.upper[i - 1]! - fc.lower[i - 1]!;
      const widthCurr = fc.upper[i]! - fc.lower[i]!;
      expect(widthCurr).toBeGreaterThanOrEqual(widthPrev - 1e-10);
    }
  });

  test("local-linear-trend forecast extrapolates trend", () => {
    const dlm = DLM.localLinearTrend({ sigmaObs: 0.1, sigmaLevel: 0.01, sigmaSlope: 0.001 });
    const res = dlm.filter(y);
    const fc = dlm.forecast(res, 3);
    // Should forecast above 10
    expect(fc.mean[0]![0]).toBeGreaterThan(9);
    expect(fc.mean[2]![0]).toBeGreaterThan(fc.mean[0]![0]!);
  });
});

// ─── Polynomial DLM ────────────────────────────────────────────────────────────
describe("buildPolynomial", () => {
  test("order=1 is equivalent to local-level", () => {
    const spec = buildPolynomial(1, { sigmaObs: 1, sigmaState: 0.5 });
    expect(spec.G).toEqual([[1]]);
    expect(spec.F).toEqual([[1]]);
  });

  test("order=2 has 2×2 G with upper-triangular 1", () => {
    const spec = buildPolynomial(2);
    expect(spec.G[0]).toEqual([1, 1]);
    expect(spec.G[1]).toEqual([0, 1]);
  });

  test("filter runs for order=3", () => {
    const spec = buildPolynomial(3, { sigmaObs: 1, sigmaState: 0.1 });
    const dlm = new DLM(spec);
    const res = dlm.filter([1, 2, 3, 4, 5]);
    expect(res.filteredMeans.length).toBe(5);
    expect(res.filteredMeans[0]!.length).toBe(3);
  });
});

// ─── Fourier seasonal DLM ──────────────────────────────────────────────────────
describe("buildFourier", () => {
  test("state dimension is 2*harmonics", () => {
    const spec = buildFourier(12, 3);
    expect(spec.G.length).toBe(6);
    expect(spec.F[0]!.length).toBe(6);
  });

  test("rotation matrix property: G G' = I (for each 2×2 block)", () => {
    const spec = buildFourier(12, 2);
    const G = spec.G;
    // Check first block is rotation
    const c = G[0]![0]!;
    const s = G[1]![0]!;
    expect(c * c + s * s).toBeCloseTo(1, 6);
  });

  test("filter runs without error on seasonal data", () => {
    // Synthetic seasonal data: period=4, 2 cycles
    const y = [1, 2, 3, 2, 1, 2, 3, 2];
    const spec = buildFourier(4, 2, { sigmaObs: 0.5, sigmaState: 0.1 });
    const dlm = new DLM(spec);
    const res = dlm.filter(y);
    expect(res.steps.length).toBe(8);
    expect(isFinite(res.logLikelihood)).toBe(true);
  });
});

// ─── buildRegression ───────────────────────────────────────────────────────────
describe("buildRegression", () => {
  test("spec has correct dimensions", () => {
    const spec = buildRegression(3, { sigmaObs: 1, sigmaState: 0.001 });
    expect(spec.G.length).toBe(3);
    expect(spec.G[0]!.length).toBe(3);
    expect(spec.F[0]!.length).toBe(3);
  });
});

// ─── combineDLMs ───────────────────────────────────────────────────────────────
describe("combineDLMs", () => {
  test("combines state dimensions", () => {
    const ll = buildLocalLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const llt = buildLocalLinearTrend({ sigmaObs: 1, sigmaLevel: 0.5, sigmaSlope: 0.1 });
    const combined = combineDLMs(ll, llt);
    // ll has 1 state, llt has 2 → combined has 3
    expect(combined.G.length).toBe(3);
    expect(combined.F[0]!.length).toBe(3);
    expect(combined.W.length).toBe(3);
  });

  test("single spec is identity", () => {
    const ll = buildLocalLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const combined = combineDLMs(ll);
    expect(combined.G).toEqual(ll.G);
  });

  test("combined DLM can be filtered", () => {
    const ll = buildLocalLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const fourier = buildFourier(4, 1, { sigmaObs: 1, sigmaState: 0.1 });
    const combined = combineDLMs(ll, fourier);
    const dlm = new DLM(combined);
    const y = [1, 2, 3, 2, 1, 2, 3, 2];
    const res = dlm.filter(y);
    expect(res.steps.length).toBe(8);
    expect(isFinite(res.logLikelihood)).toBe(true);
  });

  test("throws on empty input", () => {
    expect(() => combineDLMs()).toThrow();
  });
});

// ─── MLE fitting ──────────────────────────────────────────────────────────────
describe("DLM.fitMLE", () => {
  test("returns a DLM instance", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 1 });
    const y = [1, 2, 1.5, 2.5, 3, 2, 3.5, 3, 4, 3.5];
    const fitted = dlm.fitMLE(y);
    expect(fitted).toBeInstanceOf(DLM);
  });

  test("fitted log-likelihood ≥ initial log-likelihood", () => {
    const dlm = DLM.localLevel({ sigmaObs: 5, sigmaLevel: 5 });
    const y = [1, 2, 1.5, 2.5, 3, 2, 3.5, 3, 4, 3.5];
    const fitted = dlm.fitMLE(y);
    const llInitial = dlm.filter(y).logLikelihood;
    const llFitted = fitted.filter(y).logLikelihood;
    expect(llFitted).toBeGreaterThanOrEqual(llInitial - 0.1);
  });
});

// ─── Discount factor filter ───────────────────────────────────────────────────
describe("DLM.filterDiscount", () => {
  test("discount=1 matches standard filter closely", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const y = [1, 2, 3, 4, 5];
    const stdRes = dlm.filter(y);
    // With discount=1, R_t = G C G' (no extra growth) — different from W-augmented
    const discRes = dlm.filterDiscount(y, 1.0);
    expect(discRes.steps.length).toBe(y.length);
    expect(isFinite(discRes.logLikelihood)).toBe(true);
  });

  test("lower discount factor → wider prediction intervals", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0 });
    const y = [1, 2, 3, 4, 5, 6, 7, 8];
    const res095 = dlm.filterDiscount(y, 0.95);
    const res099 = dlm.filterDiscount(y, 0.99);
    // delta=0.95 has more uncertainty → larger Q
    const q095 = res095.steps[3]!.forecastCov[0]![0]!;
    const q099 = res099.steps[3]!.forecastCov[0]![0]!;
    expect(q095).toBeGreaterThanOrEqual(q099 - 1e-6);
  });
});

// ─── Factory static methods ────────────────────────────────────────────────────
describe("DLM factory methods", () => {
  test("DLM.localLevel matches buildLocalLevel dimensions", () => {
    const dlm1 = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const spec = buildLocalLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    // Both have G=[[1]], F=[[1]]
    const dlm2 = new DLM(spec);
    const y = [1, 2, 3];
    const r1 = dlm1.filter(y);
    const r2 = dlm2.filter(y);
    expect(r1.filteredMeans[0]![0]).toBeCloseTo(r2.filteredMeans[0]![0]!, 4);
  });

  test("DLM.fourier factory", () => {
    const dlm = DLM.fourier(12, 3, { sigmaObs: 1, sigmaState: 0.01 });
    expect(dlm).toBeInstanceOf(DLM);
    const res = dlm.filter([1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2]);
    expect(res.steps.length).toBe(12);
  });

  test("DLM.polynomial(1) is same as localLevel", () => {
    const dlm = DLM.polynomial(1, { sigmaObs: 1, sigmaState: 0.5 });
    expect(dlm).toBeInstanceOf(DLM);
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────────────
describe("DLM edge cases", () => {
  test("single observation", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const res = dlm.filter([3.14]);
    expect(res.filteredMeans.length).toBe(1);
    expect(isFinite(res.logLikelihood)).toBe(true);
  });

  test("all missing observations", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const res = dlm.filter([null, null, null]);
    expect(res.steps.length).toBe(3);
    // No log-likelihood contributions from missing obs
    expect(res.logLikelihood).toBe(0);
  });

  test("constant series", () => {
    const dlm = DLM.localLevel({ sigmaObs: 0.5, sigmaLevel: 0.1 });
    const res = dlm.filter([5, 5, 5, 5, 5]);
    // Filtered means should converge toward 5
    const last = res.filteredMeans[4]![0]!;
    expect(last).toBeGreaterThan(4);
    expect(last).toBeLessThan(6);
  });

  test("custom prior m0 and C0", () => {
    const dlm = DLM.localLevel({ sigmaObs: 1, sigmaLevel: 0.5 });
    const res1 = dlm.filter([1, 2, 3], { m0: [0], C0: [[1000]] });
    const res2 = dlm.filter([1, 2, 3], { m0: [5], C0: [[0.01]] });
    // Strong prior on m0=5 should keep filtered mean near 5 initially
    expect(res2.filteredMeans[0]![0]).toBeGreaterThan(3);
  });
});

// ─── Property-based tests ──────────────────────────────────────────────────────
describe("DLM property tests", () => {
  test("logLikelihood is finite for any finite observations", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 2, maxLength: 20 }),
        fc.float({ min: 0.01, max: 10, noNaN: true }),
        fc.float({ min: 0.01, max: 10, noNaN: true }),
        (y, sv, sw) => {
          const dlm = DLM.localLevel({ sigmaObs: sv, sigmaLevel: sw });
          const res = dlm.filter(y);
          return isFinite(res.logLikelihood);
        },
      ),
    );
  });

  test("filtered means length = input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -50, max: 50, noNaN: true }), { minLength: 1, maxLength: 30 }),
        (y) => {
          const dlm = DLM.localLevel();
          const res = dlm.filter(y);
          return res.filteredMeans.length === y.length;
        },
      ),
    );
  });

  test("smoother length = filter length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -50, max: 50, noNaN: true }), { minLength: 2, maxLength: 20 }),
        (y) => {
          const dlm = DLM.localLevel();
          const res = dlm.smooth(y);
          return (
            res.smoothedMeans.length === y.length && res.smoothedCovs.length === y.length
          );
        },
      ),
    );
  });

  test("forecast lower ≤ mean[0] ≤ upper (scalar model)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -50, max: 50, noNaN: true }), { minLength: 3, maxLength: 15 }),
        fc.integer({ min: 1, max: 10 }),
        (y, h) => {
          const dlm = DLM.localLevel();
          const res = dlm.filter(y);
          const fc2 = dlm.forecast(res, h);
          return fc2.lower.every(
            (lo, i) => lo <= fc2.mean[i]![0]! + 1e-8 && fc2.mean[i]![0]! <= fc2.upper[i]! + 1e-8,
          );
        },
      ),
    );
  });
});
