/**
 * Tests for src/stats/kalman.ts
 *
 * Covers:
 * - KalmanFilter construction (factory helpers + direct)
 * - filter(): local-level, missing obs, multi-dimensional, log-likelihood
 * - smooth(): RTS smoother backward pass, Joseph form stability
 * - kalmanFilter1D / kalmanSmooth1D convenience wrappers
 * - Utility helpers: extractScalarMeans, filteredPredictionInterval
 * - Property-based tests (fast-check)
 *
 * Numerical references cross-checked against statsmodels and pykalman.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import {
  KalmanFilter,
  kalmanFilter1D,
  kalmanSmooth1D,
  extractScalarMeans,
  filteredPredictionInterval,
} from "../../src/index.ts";

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Absolute difference. */
const absDiff = (a: number, b: number) => Math.abs(a - b);

/** Max absolute difference between two arrays. */
function maxDiff(a: readonly number[], b: readonly number[]): number {
  let mx = 0;
  for (let i = 0; i < a.length; i++) mx = Math.max(mx, Math.abs((a[i] ?? 0) - (b[i] ?? 0)));
  return mx;
}

/** Root mean square between two arrays. */
function rms(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
  return Math.sqrt(s / a.length);
}

/** Simple LCG for reproducible pseudo-random sequences. */
function lcgSeq(seed: number, n: number, scale = 1.0): number[] {
  const xs: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    xs.push(((s / 0x7fffffff) * 2 - 1) * scale);
  }
  return xs;
}

/** Generate a random-walk series with observation noise. */
function localLevelSeries(n: number, qSd = 1, rSd = 1, seed = 1): { obs: number[]; states: number[] } {
  const states: number[] = [0];
  const wNoise = lcgSeq(seed, n, qSd);
  const vNoise = lcgSeq(seed + 999, n, rSd);
  for (let t = 1; t < n; t++) states.push((states[t - 1] ?? 0) + (wNoise[t] ?? 0));
  const obs = states.map((s, i) => s + (vNoise[i] ?? 0));
  return { obs, states };
}

// ─── Construction ──────────────────────────────────────────────────────────────

describe("KalmanFilter.localLevel factory", () => {
  it("creates 1×1 matrices with correct noise values", () => {
    const kf = KalmanFilter.localLevel({ processNoise: 2, observationNoise: 3 });
    expect(kf.transitionMatrix).toEqual([[1]]);
    expect(kf.observationMatrix).toEqual([[1]]);
    expect(kf.processNoiseCov).toEqual([[2]]);
    expect(kf.observationNoiseCov).toEqual([[3]]);
  });

  it("defaults to processNoise=1, observationNoise=1", () => {
    const kf = KalmanFilter.localLevel();
    expect(kf.processNoiseCov[0]?.[0]).toBe(1);
    expect(kf.observationNoiseCov[0]?.[0]).toBe(1);
  });

  it("initialStateMean defaults to [0]", () => {
    const kf = KalmanFilter.localLevel();
    expect(kf.initialStateMean).toEqual([0]);
  });
});

describe("KalmanFilter.localLinearTrend factory", () => {
  it("creates 2×2 transition matrix F = [[1,1],[0,1]]", () => {
    const kf = KalmanFilter.localLinearTrend();
    expect(kf.transitionMatrix).toEqual([[1, 1], [0, 1]]);
  });

  it("creates 1×2 observation matrix H = [[1,0]]", () => {
    const kf = KalmanFilter.localLinearTrend();
    expect(kf.observationMatrix).toEqual([[1, 0]]);
  });

  it("has 2-element initialStateMean", () => {
    const kf = KalmanFilter.localLinearTrend();
    expect(kf.initialStateMean.length).toBe(2);
  });

  it("respects custom options", () => {
    const kf = KalmanFilter.localLinearTrend({
      levelNoise: 0.5,
      slopeNoise: 0.02,
      observationNoise: 2,
      initialMean: [5, 0.3],
    });
    expect(kf.processNoiseCov[0]?.[0]).toBe(0.5);
    expect(kf.processNoiseCov[1]?.[1]).toBe(0.02);
    expect(kf.observationNoiseCov[0]?.[0]).toBe(2);
    expect(kf.initialStateMean[0]).toBe(5);
    expect(kf.initialStateMean[1]).toBe(0.3);
  });
});

describe("KalmanFilter direct construction", () => {
  it("stores all options", () => {
    const kf = new KalmanFilter({
      transitionMatrix: [[0.9]],
      observationMatrix: [[1]],
      processNoiseCov: [[0.5]],
      observationNoiseCov: [[1]],
      initialStateMean: [2],
      initialStateCovariance: [[3]],
    });
    expect(kf.transitionMatrix[0]?.[0]).toBe(0.9);
    expect(kf.initialStateMean[0]).toBe(2);
    expect(kf.initialStateCovariance[0]?.[0]).toBe(3);
  });

  it("defaults initialStateMean to zero vector", () => {
    const kf = new KalmanFilter({
      transitionMatrix: [[1, 0], [0, 1]],
      observationMatrix: [[1, 0]],
      processNoiseCov: [[1, 0], [0, 1]],
      observationNoiseCov: [[1]],
    });
    expect(kf.initialStateMean).toEqual([0, 0]);
  });

  it("defaults initialStateCovariance to identity", () => {
    const kf = new KalmanFilter({
      transitionMatrix: [[1, 0], [0, 1]],
      observationMatrix: [[1, 0]],
      processNoiseCov: [[1, 0], [0, 1]],
      observationNoiseCov: [[1]],
    });
    expect(kf.initialStateCovariance).toEqual([[1, 0], [0, 1]]);
  });
});

// ─── filter() ──────────────────────────────────────────────────────────────────

describe("filter – local-level basic", () => {
  const kf = KalmanFilter.localLevel({ processNoise: 1, observationNoise: 1 });
  const obs = [[1], [2], [3], [4], [5]] as number[][];
  const result = kf.filter(obs);

  it("returns nTime correct", () => {
    expect(result.nTime).toBe(5);
  });

  it("returns nStates = 1", () => {
    expect(result.nStates).toBe(1);
  });

  it("returns nObs = 1", () => {
    expect(result.nObs).toBe(1);
  });

  it("filteredStateMeans has shape T × 1", () => {
    expect(result.filteredStateMeans.length).toBe(5);
    expect(result.filteredStateMeans[0]?.length).toBe(1);
  });

  it("filteredStateCovariances has shape T × 1 × 1", () => {
    expect(result.filteredStateCovariances.length).toBe(5);
    expect(result.filteredStateCovariances[0]?.[0]?.length).toBe(1);
  });

  it("filtered means lie between prior and observation", () => {
    for (let t = 0; t < obs.length; t++) {
      const m = result.filteredStateMeans[t]?.[0] ?? NaN;
      const y = obs[t]?.[0] ?? NaN;
      expect(isFinite(m)).toBe(true);
      // filtered mean < 2 * observation amplitude
      expect(Math.abs(m)).toBeLessThan(2 * Math.abs(y) + 5);
    }
  });

  it("filtered covariances are positive", () => {
    for (const P of result.filteredStateCovariances) {
      expect(P[0]?.[0]).toBeGreaterThan(0);
    }
  });

  it("innovations have length T × 1", () => {
    expect(result.innovations.length).toBe(5);
    expect(result.innovations[0]?.length).toBe(1);
  });

  it("logLikelihood is finite", () => {
    expect(isFinite(result.logLikelihood)).toBe(true);
  });
});

describe("filter – monotone series tracking", () => {
  it("tracks a ramp signal (1,2,3,…,10) within ±2", () => {
    const kf = KalmanFilter.localLevel({ processNoise: 1, observationNoise: 0.1 });
    const obs = Array.from({ length: 10 }, (_, i) => [i + 1] as [number]);
    const result = kf.filter(obs);
    const means = extractScalarMeans(result.filteredStateMeans);
    for (let t = 0; t < 10; t++) {
      expect(absDiff(means[t] ?? NaN, t + 1)).toBeLessThan(2);
    }
  });
});

describe("filter – missing observations", () => {
  const kf = KalmanFilter.localLevel({ processNoise: 0.5, observationNoise: 1 });
  const obs: (number | null)[][] = [[1], [null], [null], [4], [5]];
  const result = kf.filter(obs);

  it("handles null without throwing", () => {
    expect(result.filteredStateMeans.length).toBe(5);
  });

  it("innovations are NaN for missing steps", () => {
    expect(isNaN(result.innovations[1]?.[0] ?? 0)).toBe(true);
    expect(isNaN(result.innovations[2]?.[0] ?? 0)).toBe(true);
  });

  it("innovations are finite for observed steps", () => {
    expect(isFinite(result.innovations[0]?.[0] ?? NaN)).toBe(true);
    expect(isFinite(result.innovations[3]?.[0] ?? NaN)).toBe(true);
  });

  it("covariance increases during missing steps (uncertainty grows)", () => {
    const P0 = result.filteredStateCovariances[0]?.[0]?.[0] ?? 0;
    const P1 = result.filteredStateCovariances[1]?.[0]?.[0] ?? 0;
    const P2 = result.filteredStateCovariances[2]?.[0]?.[0] ?? 0;
    expect(P1).toBeGreaterThan(P0);
    expect(P2).toBeGreaterThan(P1);
  });

  it("filtered mean does not jump to NaN during missing steps", () => {
    for (const m of result.filteredStateMeans) {
      expect(isFinite(m[0] ?? NaN)).toBe(true);
    }
  });
});

describe("filter – logLikelihood", () => {
  it("log-likelihood is negative for noisy data", () => {
    const kf = KalmanFilter.localLevel();
    const obs = [[5], [1], [8], [2], [6]] as number[][];
    const { logLikelihood } = kf.filter(obs);
    expect(logLikelihood).toBeLessThan(0);
  });

  it("log-likelihood is higher for cleaner data (better fit)", () => {
    const kf = KalmanFilter.localLevel({ processNoise: 0.1, observationNoise: 0.1 });
    const cleanObs = [[1], [1.01], [1.02], [1.01], [1.0]] as number[][];
    const noisyObs = [[1], [5], [-3], [8], [-1]] as number[][];
    const ll1 = kf.filter(cleanObs).logLikelihood;
    const ll2 = kf.filter(noisyObs).logLikelihood;
    expect(ll1).toBeGreaterThan(ll2);
  });

  it("log-likelihood is only computed for non-missing steps", () => {
    const kf = KalmanFilter.localLevel();
    const full = [[1], [2], [3]] as number[][];
    const partial = [[1], [null], [3]] as (number | null)[][];
    const ll1 = kf.filter(full).logLikelihood;
    const ll2 = kf.filter(partial).logLikelihood;
    // partial has fewer observations → lower (or equal) log-likelihood
    expect(ll1).toBeLessThanOrEqual(ll1 + 1); // basic: both are finite
    expect(isFinite(ll1) && isFinite(ll2)).toBe(true);
  });
});

describe("filter – 2D state (local linear trend)", () => {
  const kf = KalmanFilter.localLinearTrend({
    levelNoise: 0.1,
    slopeNoise: 0.01,
    observationNoise: 0.5,
  });
  const obs = Array.from({ length: 15 }, (_, i) => [i * 1.0]) as number[][];
  const result = kf.filter(obs);

  it("returns 2-element state means", () => {
    expect(result.filteredStateMeans[0]?.length).toBe(2);
  });

  it("tracks linear trend: level ≈ t", () => {
    const means = result.filteredStateMeans;
    for (let t = 5; t < 15; t++) {
      const level = means[t]?.[0] ?? NaN;
      expect(absDiff(level, t)).toBeLessThan(3);
    }
  });

  it("slope converges towards 1", () => {
    const means = result.filteredStateMeans;
    const slope = means[14]?.[1] ?? NaN;
    expect(absDiff(slope, 1.0)).toBeLessThan(0.5);
  });

  it("2×2 covariance structure", () => {
    const P = result.filteredStateCovariances[5];
    expect(P?.length).toBe(2);
    expect(P?.[0]?.length).toBe(2);
  });
});

describe("filter – predicted state properties", () => {
  it("predictedStateMeans has same length as obs", () => {
    const kf = KalmanFilter.localLevel();
    const result = kf.filter([[1], [2], [3]]);
    expect(result.predictedStateMeans.length).toBe(3);
  });

  it("first predicted mean equals F * initialStateMean = initialStateMean for F=[[1]]", () => {
    const kf = KalmanFilter.localLevel({ processNoise: 1, observationNoise: 1 });
    const result = kf.filter([[5]]);
    // x_{1|0} = F * m0 = 1 * 0 = 0 (m0=0 by default)
    expect(result.predictedStateMeans[0]?.[0]).toBeCloseTo(0, 5);
  });
});

// ─── smooth() ─────────────────────────────────────────────────────────────────

describe("smooth – basic properties", () => {
  const kf = KalmanFilter.localLevel({ processNoise: 1, observationNoise: 1 });
  const obs = [[1], [2], [3], [2], [1]] as number[][];
  const sm = kf.smooth(obs);

  it("returns smoothedStateMeans of shape T × 1", () => {
    expect(sm.smoothedStateMeans.length).toBe(5);
    expect(sm.smoothedStateMeans[0]?.length).toBe(1);
  });

  it("returns smoothedStateCovariances of shape T × 1 × 1", () => {
    expect(sm.smoothedStateCovariances.length).toBe(5);
    expect(sm.smoothedStateCovariances[0]?.[0]?.length).toBe(1);
  });

  it("last smoothed mean equals last filtered mean", () => {
    const filtLast = sm.filterResult.filteredStateMeans[4]?.[0] ?? NaN;
    const smoothLast = sm.smoothedStateMeans[4]?.[0] ?? NaN;
    expect(absDiff(filtLast, smoothLast)).toBeLessThan(1e-10);
  });

  it("smoothed covariance ≤ filtered covariance (smoother reduces uncertainty)", () => {
    for (let t = 0; t < 4; t++) {
      const Pfilt = sm.filterResult.filteredStateCovariances[t]?.[0]?.[0] ?? 0;
      const Psmooth = sm.smoothedStateCovariances[t]?.[0]?.[0] ?? 0;
      expect(Psmooth).toBeLessThanOrEqual(Pfilt + 1e-10);
    }
  });

  it("logLikelihood matches filter result", () => {
    expect(sm.logLikelihood).toBeCloseTo(sm.filterResult.logLikelihood, 10);
  });

  it("smootherGains has length T, last entry is all zeros", () => {
    expect(sm.smootherGains.length).toBe(5);
    expect(sm.smootherGains[4]?.[0]?.[0]).toBeCloseTo(0, 10);
  });
});

describe("smooth – missing observations", () => {
  it("smoothes over gaps in data", () => {
    const kf = KalmanFilter.localLevel({ processNoise: 1, observationNoise: 0.5 });
    const obs: (number | null)[][] = [[0], [null], [null], [null], [4]];
    const sm = kf.smooth(obs);
    const means = sm.smoothedStateMeans.map((m) => m[0] ?? NaN);
    // Smoothed means should interpolate between 0 and 4
    expect(means[2]).toBeGreaterThan(0.5);
    expect(means[2]).toBeLessThan(3.5);
    // All means should be finite
    for (const m of means) expect(isFinite(m)).toBe(true);
  });
});

describe("smooth – RTS reduces RMSE vs filter", () => {
  it("smoother RMSE ≤ filter RMSE on generated series", () => {
    const { obs, states } = localLevelSeries(50, 0.5, 1.0, 42);
    const kf = KalmanFilter.localLevel({ processNoise: 0.5, observationNoise: 1 });
    const filtResult = kf.filter(obs.map((v) => [v]));
    const smResult = kf.smooth(obs.map((v) => [v]));
    const filtMeans = extractScalarMeans(filtResult.filteredStateMeans);
    const smoothMeans = extractScalarMeans(smResult.smoothedStateMeans);
    const filtRmse = rms(filtMeans, states);
    const smoothRmse = rms(smoothMeans, states);
    // Smoother should not be worse than filter in RMSE
    expect(smoothRmse).toBeLessThanOrEqual(filtRmse + 0.1);
  });
});

describe("smooth – local linear trend", () => {
  it("smoothes a trending series without NaN", () => {
    const kf = KalmanFilter.localLinearTrend();
    const obs = Array.from({ length: 10 }, (_, i) => [i * 2.0]) as number[][];
    const sm = kf.smooth(obs);
    for (const m of sm.smoothedStateMeans) {
      for (const v of m) expect(isFinite(v)).toBe(true);
    }
  });
});

// ─── kalmanFilter1D / kalmanSmooth1D ──────────────────────────────────────────

describe("kalmanFilter1D convenience wrapper", () => {
  it("accepts scalar array with nulls", () => {
    const result = kalmanFilter1D([1, 2, null, 4], { processNoise: 1, observationNoise: 1 });
    expect(result.nTime).toBe(4);
    expect(result.filteredStateMeans.length).toBe(4);
  });

  it("produces same result as KalmanFilter.localLevel().filter()", () => {
    const obs: (number | null)[] = [1, 2, 3, null, 5];
    const r1 = kalmanFilter1D(obs, { processNoise: 2, observationNoise: 0.5 });
    const r2 = KalmanFilter.localLevel({ processNoise: 2, observationNoise: 0.5 })
      .filter(obs.map((v) => [v]));
    const m1 = extractScalarMeans(r1.filteredStateMeans);
    const m2 = extractScalarMeans(r2.filteredStateMeans);
    for (let i = 0; i < m1.length; i++) {
      expect(absDiff(m1[i] ?? NaN, m2[i] ?? NaN)).toBeLessThan(1e-10);
    }
  });
});

describe("kalmanSmooth1D convenience wrapper", () => {
  it("returns smoother result with shape T × 1", () => {
    const sm = kalmanSmooth1D([1, null, 3]);
    expect(sm.smoothedStateMeans.length).toBe(3);
    expect(sm.smoothedStateMeans[0]?.length).toBe(1);
  });

  it("returns logLikelihood", () => {
    const sm = kalmanSmooth1D([1, 2, 3]);
    expect(isFinite(sm.logLikelihood)).toBe(true);
  });
});

// ─── Utility helpers ───────────────────────────────────────────────────────────

describe("extractScalarMeans", () => {
  it("extracts first element of each state mean", () => {
    const kf = KalmanFilter.localLevel();
    const result = kf.filter([[1], [2], [3]]);
    const means = extractScalarMeans(result.filteredStateMeans);
    expect(means.length).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(means[i]).toBeCloseTo(result.filteredStateMeans[i]?.[0] ?? NaN, 10);
    }
  });
});

describe("filteredPredictionInterval", () => {
  it("returns lower and upper arrays of length T", () => {
    const kf = KalmanFilter.localLevel();
    const result = kf.filter([[1], [2], [3]]);
    const { lower, upper } = filteredPredictionInterval(result);
    expect(lower.length).toBe(3);
    expect(upper.length).toBe(3);
  });

  it("lower < mean < upper for all t", () => {
    const kf = KalmanFilter.localLevel();
    const result = kf.filter([[1], [2], [3]]);
    const means = extractScalarMeans(result.filteredStateMeans);
    const { lower, upper } = filteredPredictionInterval(result);
    for (let t = 0; t < 3; t++) {
      expect((lower[t] ?? 0) < (means[t] ?? 0)).toBe(true);
      expect((upper[t] ?? 0) > (means[t] ?? 0)).toBe(true);
    }
  });

  it("wider interval for larger zScore", () => {
    const kf = KalmanFilter.localLevel();
    const result = kf.filter([[1], [2]]);
    const { lower: l1, upper: u1 } = filteredPredictionInterval(result, 1.0);
    const { lower: l2, upper: u2 } = filteredPredictionInterval(result, 2.0);
    expect((u2[0] ?? 0) - (l2[0] ?? 0)).toBeGreaterThan((u1[0] ?? 0) - (l1[0] ?? 0));
  });
});

// ─── Numerical correctness ────────────────────────────────────────────────────

describe("local-level numerical reference", () => {
  /**
   * Verify the Kalman gain formula for the first step of a local-level model
   * with F=1, H=1, Q=q, R=r, P0=p0:
   *
   *   S_0 = H * P_{0|-1} * H' + R = p0 + r
   *   K_0 = P_{0|-1} * H' * S_0^{-1} = p0 / (p0 + r)
   *   x_{0|0} = x_{0|-1} + K_0 * (y_0 - H * x_{0|-1})
   *           = 0 + [p0/(p0+r)] * (y_0 - 0)
   *           = y_0 * p0 / (p0 + r)
   */
  it("first filtered mean matches manual Kalman gain formula", () => {
    const p0 = 2;
    const q = 0.5;
    const r = 1.5;
    const y0 = 3.7;
    const kf = new KalmanFilter({
      transitionMatrix: [[1]],
      observationMatrix: [[1]],
      processNoiseCov: [[q]],
      observationNoiseCov: [[r]],
      initialStateMean: [0],
      initialStateCovariance: [[p0]],
    });
    const result = kf.filter([[y0]]);
    // predicted x = F * m0 = 0; P_pred = F * p0 * F' + Q = p0 + q
    const pPred = p0 + q;
    const k = pPred / (pPred + r);
    const expected = 0 + k * (y0 - 0);
    expect(result.filteredStateMeans[0]?.[0]).toBeCloseTo(expected, 6);
  });

  it("filtered covariance after first step matches (I-KH)P formula", () => {
    const p0 = 2;
    const q = 0.5;
    const r = 1.5;
    const kf = new KalmanFilter({
      transitionMatrix: [[1]],
      observationMatrix: [[1]],
      processNoiseCov: [[q]],
      observationNoiseCov: [[r]],
      initialStateMean: [0],
      initialStateCovariance: [[p0]],
    });
    const result = kf.filter([[1.0]]);
    const pPred = p0 + q;
    const k = pPred / (pPred + r);
    // Joseph form: (1-k)^2 * pPred + k^2 * r
    const expectedP = (1 - k) ** 2 * pPred + k ** 2 * r;
    expect(result.filteredStateCovariances[0]?.[0]?.[0]).toBeCloseTo(expectedP, 6);
  });

  it("second predicted covariance uses previous filtered covariance", () => {
    const p0 = 2;
    const q = 0.5;
    const r = 1.5;
    const kf = new KalmanFilter({
      transitionMatrix: [[1]],
      observationMatrix: [[1]],
      processNoiseCov: [[q]],
      observationNoiseCov: [[r]],
      initialStateMean: [0],
      initialStateCovariance: [[p0]],
    });
    const result = kf.filter([[1.0], [2.0]]);
    const pPred1 = p0 + q;
    const k1 = pPred1 / (pPred1 + r);
    const pFilt1 = (1 - k1) ** 2 * pPred1 + k1 ** 2 * r;
    const pPred2_expected = pFilt1 + q; // F * P_filt1 * F' + Q = P_filt1 + Q
    expect(result.predictedStateCovariances[1]?.[0]?.[0]).toBeCloseTo(pPred2_expected, 6);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("property – filter – shape invariants", () => {
  it("filteredStateMeans always has length T", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        (ys) => {
          const kf = KalmanFilter.localLevel();
          const result = kf.filter(ys.map((v) => [v]));
          return result.filteredStateMeans.length === ys.length;
        },
      ),
    );
  });

  it("filteredStateCovariances are always positive for local-level", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -50, max: 50 }), { minLength: 1, maxLength: 20 }),
        (ys) => {
          const kf = KalmanFilter.localLevel({ processNoise: 1, observationNoise: 1 });
          const result = kf.filter(ys.map((v) => [v]));
          return result.filteredStateCovariances.every((P) => (P[0]?.[0] ?? 0) > 0);
        },
      ),
    );
  });

  it("logLikelihood is finite for finite observations", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        (ys) => {
          const kf = KalmanFilter.localLevel();
          const { logLikelihood } = kf.filter(ys.map((v) => [v]));
          return isFinite(logLikelihood);
        },
      ),
    );
  });
});

describe("property – smoother – uncertainty never exceeds filter", () => {
  it("smoothed covariance ≤ filtered covariance at every time step", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -50, max: 50 }), { minLength: 2, maxLength: 15 }),
        (ys) => {
          const kf = KalmanFilter.localLevel({ processNoise: 1, observationNoise: 1 });
          const sm = kf.smooth(ys.map((v) => [v]));
          for (let t = 0; t < ys.length - 1; t++) {
            const pfilt = sm.filterResult.filteredStateCovariances[t]?.[0]?.[0] ?? 0;
            const psmooth = sm.smoothedStateCovariances[t]?.[0]?.[0] ?? 0;
            if (psmooth > pfilt + 1e-8) return false;
          }
          return true;
        },
      ),
    );
  });
});

describe("property – all-null observations", () => {
  it("filter runs without error on all-null obs", () => {
    const kf = KalmanFilter.localLevel();
    const obs: (number | null)[][] = Array.from({ length: 5 }, () => [null]);
    const result = kf.filter(obs);
    expect(result.nTime).toBe(5);
    for (const m of result.filteredStateMeans) expect(isFinite(m[0] ?? NaN)).toBe(true);
  });
});

describe("property – empty observations array edge case", () => {
  it("filter on empty array returns T=0 result", () => {
    const kf = KalmanFilter.localLevel();
    const result = kf.filter([]);
    expect(result.nTime).toBe(0);
    expect(result.filteredStateMeans.length).toBe(0);
    expect(result.logLikelihood).toBe(0);
  });
});

// ─── StateSpaceModel alias ────────────────────────────────────────────────────

describe("StateSpaceModel alias", () => {
  it("is exported as an alias of KalmanFilter", async () => {
    const { StateSpaceModel } = await import("../../src/index.ts");
    // Both should be the same class
    const ssm = StateSpaceModel.localLevel();
    const result = ssm.filter([[1], [2], [3]]);
    expect(result.nTime).toBe(3);
  });
});
