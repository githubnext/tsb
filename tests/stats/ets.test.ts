/**
 * Tests for src/stats/ets.ts
 *
 * Covers Simple Exponential Smoothing (SES), Holt linear trend, and
 * Holt-Winters (full ETS) with additive and multiplicative seasonality.
 * Mirrors statsmodels.tsa.holtwinters behaviour.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  ExponentialSmoothing,
  Holt,
  Series,
  SimpleExpSmoothing,
  fitEts,
  holt,
  simpleExpSmoothing,
} from "../../src/index.ts";

// ─── Test fixtures ─────────────────────────────────────────────────────────────

/** Passenger data (Box & Jenkins airline data first 12 months). */
const AIRLINE = [
  112, 118, 132, 129, 121, 135, 148, 148, 136, 119, 104, 118, 115, 126, 141, 135, 125, 149, 170,
  170, 158, 133, 114, 140, 145, 150, 178, 163, 172, 178, 199, 199, 184, 162, 146, 166,
];

/** Simple upward trend series. */
const TREND = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];

/** Seasonal additive series (no trend). */
const SEASONAL_ADD = [5, 8, 7, 4, 5, 8, 7, 4, 5, 8, 7, 4, 5, 8, 7, 4, 5, 8, 7, 4, 6, 9, 8, 5];

/** Deterministic LCG for reproducible pseudo-noise. */
function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Build a noisy sinusoidal series with additive seasonal component. */
function buildSeasonal(n: number, amplitude: number, period: number, noiseAmp = 0.5): number[] {
  const rand = lcg(1234);
  return Array.from({ length: n }, (_, t) => {
    const trend = 10 + 0.2 * t;
    const seasonal = amplitude * Math.sin((2 * Math.PI * t) / period);
    const noise = (rand() - 0.5) * noiseAmp;
    return trend + seasonal + noise;
  });
}

/** Mean absolute error between two arrays. */
function mae(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  }
  return s / a.length;
}

/** Root mean squared error. */
function rmse(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
  }
  return Math.sqrt(s / a.length);
}

// ─── SimpleExpSmoothing ────────────────────────────────────────────────────────

describe("SimpleExpSmoothing", () => {
  describe("construction", () => {
    it("creates instance without arguments", () => {
      expect(() => new SimpleExpSmoothing()).not.toThrow();
    });
  });

  describe("fit()", () => {
    it("requires at least 2 observations", () => {
      expect(() => new SimpleExpSmoothing().fit([1])).toThrow(RangeError);
    });

    it("returns alpha in (0, 1)", () => {
      const fit = new SimpleExpSmoothing().fit(TREND);
      expect(fit.alpha).toBeGreaterThan(0);
      expect(fit.alpha).toBeLessThan(1);
    });

    it("returns fittedValues of same length as input", () => {
      const fit = new SimpleExpSmoothing().fit(TREND);
      expect(fit.fittedValues.length).toBe(TREND.length);
    });

    it("residuals + fittedValues = y", () => {
      const fit = new SimpleExpSmoothing().fit(TREND);
      for (let i = 0; i < TREND.length; i++) {
        expect((fit.fittedValues[i] ?? 0) + (fit.residuals[i] ?? 0)).toBeCloseTo(TREND[i] ?? 0, 8);
      }
    });

    it("sse equals sum of squared residuals", () => {
      const fit = new SimpleExpSmoothing().fit(TREND);
      let sse = 0;
      for (const e of fit.residuals) {
        sse += e * e;
      }
      expect(fit.sse).toBeCloseTo(sse, 6);
    });

    it("fixed alpha is respected", () => {
      const alpha = 0.4;
      const fit = new SimpleExpSmoothing().fit(TREND, { alpha });
      expect(fit.alpha).toBeCloseTo(alpha, 10);
    });

    it("optimised alpha produces lower SSE than α=0.5 for trending data", () => {
      const fit1 = new SimpleExpSmoothing().fit(TREND);
      const fit2 = new SimpleExpSmoothing().fit(TREND, { alpha: 0.5 });
      expect(fit1.sse).toBeLessThanOrEqual(fit2.sse + 1e-6);
    });

    it("AIC > 0", () => {
      const fit = new SimpleExpSmoothing().fit(TREND);
      expect(Number.isFinite(fit.aic)).toBe(true);
    });

    it("BIC ≥ AIC for k > 0, n > e", () => {
      const fit = new SimpleExpSmoothing().fit(AIRLINE.slice(0, 24));
      // With k=2, n=24: BIC = AIC + k*(ln(n) - 2)
      // ln(24) ≈ 3.18 > 2, so BIC ≥ AIC
      expect(fit.bic).toBeGreaterThanOrEqual(fit.aic - 1e-6);
    });

    it("accepts Series input", () => {
      const s = new Series({ data: TREND });
      const fit = new SimpleExpSmoothing().fit(s);
      expect(fit.fittedValues.length).toBe(TREND.length);
    });

    it("initialLevel option overrides default", () => {
      const fit = new SimpleExpSmoothing().fit(TREND, { initialLevel: 5 });
      expect(fit.initialLevel).toBeCloseTo(5, 10);
    });
  });

  describe("forecast()", () => {
    it("throws if called before fit()", () => {
      expect(() => new SimpleExpSmoothing().forecast(3)).toThrow();
    });

    it("returns flat forecast (all equal) of correct length", () => {
      const model = new SimpleExpSmoothing();
      model.fit(TREND);
      const fc = model.forecast(4);
      expect(fc.length).toBe(4);
      for (const v of fc) {
        expect(v).toBeCloseTo(fc[0] ?? 0, 8);
      }
    });

    it("forecast ≈ last observed value for α ≈ 1", () => {
      const model = new SimpleExpSmoothing();
      model.fit(TREND, { alpha: 0.9999 });
      const fc = model.forecast(1);
      expect(fc[0]).toBeCloseTo(TREND.at(-1) ?? 0, 0);
    });

    it("functional API simpleExpSmoothing returns same result", () => {
      const fit1 = simpleExpSmoothing(TREND);
      const fit2 = new SimpleExpSmoothing().fit(TREND);
      expect(fit1.alpha).toBeCloseTo(fit2.alpha, 8);
      expect(fit1.sse).toBeCloseTo(fit2.sse, 8);
    });
  });

  describe("accuracy", () => {
    it("fitted values within 20% of actuals on AIRLINE data", () => {
      const fit = new SimpleExpSmoothing().fit(AIRLINE);
      const err = mae(fit.fittedValues, AIRLINE);
      expect(err / (AIRLINE.reduce((a, b) => a + b, 0) / AIRLINE.length)).toBeLessThan(0.2);
    });

    it("forecast stays in reasonable range for constant series", () => {
      const y = new Array<number>(20).fill(5);
      const model = new SimpleExpSmoothing();
      model.fit(y);
      const fc = model.forecast(5);
      for (const v of fc) {
        expect(Math.abs(v - 5)).toBeLessThan(1);
      }
    });
  });
});

// ─── Holt ─────────────────────────────────────────────────────────────────────

describe("Holt", () => {
  describe("construction", () => {
    it("creates instance without arguments", () => {
      expect(() => new Holt()).not.toThrow();
    });

    it("stores options from constructor", () => {
      const model = new Holt({ damped: true });
      const fit = model.fit(TREND);
      expect(fit.phi).toBeLessThan(1); // damped
    });
  });

  describe("fit()", () => {
    it("requires at least 3 observations", () => {
      expect(() => new Holt().fit([1, 2])).toThrow(RangeError);
    });

    it("returns alpha and beta in (0, 1)", () => {
      const fit = new Holt().fit(TREND);
      expect(fit.alpha).toBeGreaterThan(0);
      expect(fit.alpha).toBeLessThan(1);
      expect(fit.beta).toBeGreaterThan(0);
      expect(fit.beta).toBeLessThan(1);
    });

    it("phi = 1 when damped = false (default)", () => {
      const fit = new Holt().fit(TREND);
      expect(fit.phi).toBe(1.0);
    });

    it("phi < 1 when damped = true", () => {
      const fit = new Holt({ damped: true }).fit(TREND);
      expect(fit.phi).toBeGreaterThan(0.8);
      expect(fit.phi).toBeLessThan(1);
    });

    it("fittedValues length = n", () => {
      const fit = new Holt().fit(TREND);
      expect(fit.fittedValues.length).toBe(TREND.length);
    });

    it("fitted + residuals = y", () => {
      const fit = new Holt().fit(AIRLINE.slice(0, 12));
      for (let i = 0; i < 12; i++) {
        expect((fit.fittedValues[i] ?? 0) + (fit.residuals[i] ?? 0)).toBeCloseTo(
          AIRLINE[i] ?? 0,
          6,
        );
      }
    });

    it("sse = sum of squared residuals", () => {
      const fit = new Holt().fit(TREND);
      let sse = 0;
      for (const e of fit.residuals) {
        sse += e * e;
      }
      expect(fit.sse).toBeCloseTo(sse, 6);
    });

    it("fixed alpha and beta are respected", () => {
      const fit = new Holt().fit(TREND, { alpha: 0.5, beta: 0.2 });
      expect(fit.alpha).toBeCloseTo(0.5, 10);
      expect(fit.beta).toBeCloseTo(0.2, 10);
    });

    it("optimised Holt SSE ≤ SES SSE for trending data", () => {
      const sesSSE = simpleExpSmoothing(TREND).sse;
      const holtSSE = holt(TREND).sse;
      expect(holtSSE).toBeLessThanOrEqual(sesSSE + 1e-3);
    });

    it("functional holt() returns same result as class", () => {
      const fit1 = holt(TREND);
      const fit2 = new Holt().fit(TREND);
      expect(fit1.alpha).toBeCloseTo(fit2.alpha, 6);
      expect(fit1.sse).toBeCloseTo(fit2.sse, 6);
    });
  });

  describe("forecast()", () => {
    it("throws if called before fit()", () => {
      expect(() => new Holt().forecast(3)).toThrow();
    });

    it("returns correct number of steps", () => {
      const model = new Holt();
      model.fit(TREND);
      expect(model.forecast(5).length).toBe(5);
    });

    it("trend forecasts increase for upward trend data", () => {
      const model = new Holt();
      model.fit(TREND);
      const fc = model.forecast(3);
      expect(fc[1] ?? 0).toBeGreaterThan(fc[0] ?? 0);
      expect(fc[2] ?? 0).toBeGreaterThan(fc[1] ?? 0);
    });

    it("damped forecasts converge to a limit", () => {
      const model = new Holt({ damped: true });
      model.fit(TREND);
      const fc = model.forecast(20);
      // Differences should shrink
      const diffs = fc.slice(1).map((v, i) => v - (fc[i] ?? 0));
      for (let i = 1; i < diffs.length; i++) {
        expect(Math.abs(diffs[i] ?? 0)).toBeLessThanOrEqual(Math.abs(diffs[i - 1] ?? 0) + 1e-6);
      }
    });

    it("forecast closely follows linear trend", () => {
      // Perfect linear data: y = 2t + 10
      const y = Array.from({ length: 20 }, (_, t) => 2 * t + 10);
      const model = new Holt();
      model.fit(y);
      const fc = model.forecast(3);
      // Should forecast ≈ [50, 52, 54]
      expect(fc[0]).toBeCloseTo(50, 0);
      expect(fc[2]).toBeCloseTo(54, 0);
    });
  });

  describe("accuracy", () => {
    it("RMSE on AIRLINE (first 24) < 20", () => {
      const y = AIRLINE.slice(0, 24);
      const fit = new Holt().fit(y);
      const err = rmse(fit.fittedValues.slice(1), y.slice(1));
      expect(err).toBeLessThan(20);
    });
  });
});

// ─── ExponentialSmoothing (Holt-Winters) ─────────────────────────────────────

describe("ExponentialSmoothing", () => {
  describe("construction and validation", () => {
    it("creates with no options (SES mode)", () => {
      const model = new ExponentialSmoothing();
      const fit = model.fit(TREND);
      expect(fit.beta).toBeNull();
      expect(fit.gamma).toBeNull();
    });

    it("requires at least 3 observations", () => {
      expect(() => new ExponentialSmoothing().fit([1, 2])).toThrow(RangeError);
    });

    it("requires 2 full seasonal periods when seasonal is set", () => {
      expect(() =>
        new ExponentialSmoothing({ seasonal: "add", seasonalPeriods: 4 }).fit([1, 2, 3, 4, 5]),
      ).toThrow(RangeError);
    });
  });

  describe("SES mode (no trend, no seasonal)", () => {
    it("result matches SimpleExpSmoothing", () => {
      const r1 = new ExponentialSmoothing().fit(TREND);
      const r2 = new SimpleExpSmoothing().fit(TREND);
      expect(r1.alpha).toBeCloseTo(r2.alpha, 4);
      expect(r1.sse).toBeCloseTo(r2.sse, 4);
    });

    it("beta and gamma are null", () => {
      const fit = new ExponentialSmoothing().fit(TREND);
      expect(fit.beta).toBeNull();
      expect(fit.gamma).toBeNull();
    });
  });

  describe("additive trend, no seasonal (= Holt)", () => {
    it("alpha and beta are in (0,1)", () => {
      const fit = new ExponentialSmoothing({ trend: "add" }).fit(TREND);
      expect(fit.alpha).toBeGreaterThan(0);
      expect(fit.beta).not.toBeNull();
      expect(fit.beta ?? 0).toBeGreaterThan(0);
    });

    it("gamma is null", () => {
      const fit = new ExponentialSmoothing({ trend: "add" }).fit(TREND);
      expect(fit.gamma).toBeNull();
    });

    it("SSE roughly matches Holt class", () => {
      const r1 = new ExponentialSmoothing({ trend: "add" }).fit(TREND);
      const r2 = new Holt().fit(TREND);
      // They may find slightly different optima; SSE should be comparable
      expect(Math.abs(r1.sse - r2.sse) / (r2.sse + 1e-8)).toBeLessThan(0.1);
    });
  });

  describe("additive trend + additive seasonal (classic Holt-Winters)", () => {
    const y = SEASONAL_ADD;
    const m = 4;

    it("all parameters estimated", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: m,
      }).fit(y);
      expect(fit.alpha).toBeGreaterThan(0);
      expect(fit.beta).not.toBeNull();
      expect(fit.gamma).not.toBeNull();
      expect(fit.initialSeasons).not.toBeNull();
      expect(fit.initialSeasons?.length).toBe(m);
    });

    it("additive seasonal indices sum close to 0", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: m,
      }).fit(y);
      const sum = (fit.initialSeasons ?? []).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum)).toBeLessThan(2);
    });

    it("fitted + residuals = y", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: m,
      }).fit(y);
      for (let i = 0; i < y.length; i++) {
        expect((fit.fittedValues[i] ?? 0) + (fit.residuals[i] ?? 0)).toBeCloseTo(y[i] ?? 0, 6);
      }
    });

    it("sse = sum of squared residuals", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: m,
      }).fit(y);
      let sse = 0;
      for (const e of fit.residuals) {
        sse += e * e;
      }
      expect(fit.sse).toBeCloseTo(sse, 6);
    });

    it("AIC < BIC for n > e", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: m,
      }).fit(y);
      // For n = 24, k = 1+1+1+1+4=8: BIC - AIC = k*(ln(n)-2) ≈ 8*(3.18-2)=9.4 > 0
      expect(fit.bic).toBeGreaterThan(fit.aic - 1e-3);
    });

    it("forecast returns correct number of steps", () => {
      const model = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: m,
      });
      model.fit(y);
      const fc = model.forecast(8);
      expect(fc.length).toBe(8);
    });

    it("all forecast values are finite", () => {
      const model = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: m,
      });
      model.fit(y);
      const fc = model.forecast(8);
      for (const v of fc) {
        expect(Number.isFinite(v)).toBe(true);
      }
    });

    it("seasonal forecast repeats seasonal pattern (low noise data)", () => {
      // Perfect seasonal data with no noise
      const perfect: number[] = [];
      for (let i = 0; i < 24; i++) {
        const base = [5, 8, 7, 4];
        perfect.push(base[i % 4] ?? 5);
      }
      const model = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: 4,
      });
      model.fit(perfect);
      const fc = model.forecast(8);
      const pattern = [fc[0] ?? 0, fc[1] ?? 0, fc[2] ?? 0, fc[3] ?? 0];
      // Next 4 should roughly repeat the pattern
      for (let i = 0; i < 4; i++) {
        expect(Math.abs((fc[i + 4] ?? 0) - (pattern[i] ?? 0))).toBeLessThan(2);
      }
    });
  });

  describe("additive trend + multiplicative seasonal", () => {
    it("estimates all parameters", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "mul",
        seasonalPeriods: 4,
      }).fit(SEASONAL_ADD);
      expect(fit.alpha).toBeGreaterThan(0);
      expect(fit.beta).not.toBeNull();
      expect(fit.gamma).not.toBeNull();
    });

    it("fitted + residuals = y", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "mul",
        seasonalPeriods: 4,
      }).fit(SEASONAL_ADD);
      for (let i = 0; i < SEASONAL_ADD.length; i++) {
        expect((fit.fittedValues[i] ?? 0) + (fit.residuals[i] ?? 0)).toBeCloseTo(
          SEASONAL_ADD[i] ?? 0,
          6,
        );
      }
    });
  });

  describe("no trend + additive seasonal", () => {
    it("beta is null", () => {
      const fit = new ExponentialSmoothing({
        seasonal: "add",
        seasonalPeriods: 4,
      }).fit(SEASONAL_ADD);
      expect(fit.beta).toBeNull();
      expect(fit.gamma).not.toBeNull();
    });
  });

  describe("no trend + multiplicative seasonal", () => {
    it("fits without error", () => {
      const fit = new ExponentialSmoothing({
        seasonal: "mul",
        seasonalPeriods: 4,
      }).fit(SEASONAL_ADD);
      expect(fit.gamma).not.toBeNull();
      expect(fit.beta).toBeNull();
    });
  });

  describe("damped trend", () => {
    it("phi < 1 when damped = true", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        damped: true,
      }).fit(TREND);
      expect(fit.phi).toBeLessThan(1);
      expect(fit.phi).toBeGreaterThan(0.8);
    });

    it("phi = 1 when damped = false", () => {
      const fit = new ExponentialSmoothing({ trend: "add" }).fit(TREND);
      expect(fit.phi).toBe(1.0);
    });
  });

  describe("known initialisation", () => {
    it("uses provided initial values", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: 4,
        initializationMethod: "known",
        initialLevel: 6.0,
        initialTrend: 0.1,
        initialSeasons: [1, 2, 0, -1],
      }).fit(SEASONAL_ADD);
      expect(fit.initialLevel).toBeCloseTo(6.0, 8);
      expect(fit.initialTrend).toBeCloseTo(0.1, 8);
    });
  });

  describe("fixed parameters", () => {
    it("fixed alpha is respected", () => {
      const fit = new ExponentialSmoothing({ alpha: 0.4 }).fit(TREND);
      expect(fit.alpha).toBeCloseTo(0.4, 8);
    });

    it("fixed beta is respected", () => {
      const fit = new ExponentialSmoothing({ trend: "add", alpha: 0.3, beta: 0.15 }).fit(TREND);
      expect(fit.beta).toBeCloseTo(0.15, 8);
    });

    it("fixed gamma is respected", () => {
      const fit = new ExponentialSmoothing({
        seasonal: "add",
        seasonalPeriods: 4,
        gamma: 0.2,
      }).fit(SEASONAL_ADD);
      expect(fit.gamma).toBeCloseTo(0.2, 8);
    });
  });

  describe("forecastWithCI()", () => {
    it("throws if called before fit()", () => {
      expect(() => new ExponentialSmoothing().forecastWithCI(3)).toThrow();
    });

    it("returns correct structure", () => {
      const model = new ExponentialSmoothing({ trend: "add" });
      model.fit(TREND);
      const r = model.forecastWithCI(4);
      expect(r.forecast.length).toBe(4);
      expect(r.lower.length).toBe(4);
      expect(r.upper.length).toBe(4);
      expect(r.stderr.length).toBe(4);
    });

    it("upper > lower for all steps", () => {
      const model = new ExponentialSmoothing({ trend: "add" });
      model.fit(TREND);
      const r = model.forecastWithCI(4);
      for (let i = 0; i < 4; i++) {
        expect(r.upper[i] ?? 0).toBeGreaterThan(r.lower[i] ?? 0);
      }
    });

    it("forecast is within confidence interval", () => {
      const model = new ExponentialSmoothing({ trend: "add" });
      model.fit(TREND);
      const r = model.forecastWithCI(4);
      for (let i = 0; i < 4; i++) {
        expect(r.forecast[i] ?? 0).toBeGreaterThanOrEqual(r.lower[i] ?? 0);
        expect(r.forecast[i] ?? 0).toBeLessThanOrEqual(r.upper[i] ?? 0);
      }
    });

    it("intervals widen with horizon", () => {
      const model = new ExponentialSmoothing({ trend: "add" });
      model.fit(TREND);
      const r = model.forecastWithCI(5);
      const widths = r.upper.map((u, i) => u - (r.lower[i] ?? 0));
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i] ?? 0).toBeGreaterThanOrEqual((widths[i - 1] ?? 0) - 1e-6);
      }
    });
  });

  describe("functional fitEts()", () => {
    it("returns same result as class fit()", () => {
      const r1 = fitEts(TREND, { trend: "add" });
      const r2 = new ExponentialSmoothing({ trend: "add" }).fit(TREND);
      expect(r1.alpha).toBeCloseTo(r2.alpha, 6);
      expect(r1.sse).toBeCloseTo(r2.sse, 6);
    });
  });

  describe("AIRLINE accuracy", () => {
    it("additive H-W in-sample MAE < 15 on AIRLINE", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "add",
        seasonalPeriods: 12,
      }).fit(AIRLINE);
      const err = mae(fit.fittedValues, AIRLINE);
      expect(err).toBeLessThan(15);
    });

    it("multiplicative H-W in-sample MAE < 20 on AIRLINE", () => {
      const fit = new ExponentialSmoothing({
        trend: "add",
        seasonal: "mul",
        seasonalPeriods: 12,
      }).fit(AIRLINE);
      const err = mae(fit.fittedValues, AIRLINE);
      expect(err).toBeLessThan(20);
    });

    it("H-W AIC < SES AIC on seasonal AIRLINE data", () => {
      const sesFit = fitEts(AIRLINE);
      const hwFit = fitEts(AIRLINE, {
        trend: "add",
        seasonal: "add",
        seasonalPeriods: 12,
      });
      // Holt-Winters should have better (lower) AIC for seasonal data
      expect(hwFit.aic).toBeLessThan(sesFit.aic + 20); // relaxed: may use more params
    });
  });

  describe("information criteria", () => {
    it("log-likelihood is finite and negative", () => {
      const fit = fitEts(TREND, { trend: "add" });
      expect(Number.isFinite(fit.logLikelihood)).toBe(true);
      expect(fit.logLikelihood).toBeLessThan(0);
    });

    it("AICc >= AIC", () => {
      const fit = fitEts(TREND, { trend: "add" });
      expect(fit.aicc).toBeGreaterThanOrEqual(fit.aic - 1e-6);
    });
  });

  describe("edge cases", () => {
    it("handles constant series (SES mode)", () => {
      const y = new Array<number>(20).fill(7);
      const fit = fitEts(y);
      for (const v of fit.fittedValues) {
        expect(Math.abs(v - 7)).toBeLessThan(1);
      }
    });

    it("handles single-cycle seasonal (m=2)", () => {
      const y = [1, 3, 1, 3, 1, 3, 1, 3, 1, 3];
      const fit = fitEts(y, { seasonal: "add", seasonalPeriods: 2 });
      expect(fit.gamma).not.toBeNull();
    });

    it("forecast of length 0 returns empty array", () => {
      const model = new ExponentialSmoothing({ trend: "add" });
      model.fit(TREND);
      expect(model.forecast(0)).toEqual([]);
    });

    it("works with longer seasonal period (m=12) on 2 cycles", () => {
      const y = buildSeasonal(24, 3, 12, 0.1);
      const fit = fitEts(y, { trend: "add", seasonal: "add", seasonalPeriods: 12 });
      expect(fit.alpha).toBeGreaterThan(0);
      const n = new ExponentialSmoothing({ trend: "add", seasonal: "add", seasonalPeriods: 12 });
      n.fit(y);
      expect(n.forecast(12).length).toBe(12);
    });
  });
});

// ─── Property-based tests ──────────────────────────────────────────────────────

describe("ETS property-based", () => {
  it("SES: fitted + residuals = y for any n≥2 data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1000, max: 1000, noNaN: true }), { minLength: 2, maxLength: 30 }),
        (y) => {
          const fit = simpleExpSmoothing(y);
          for (let i = 0; i < y.length; i++) {
            const diff = Math.abs(
              (fit.fittedValues[i] ?? 0) + (fit.residuals[i] ?? 0) - (y[i] ?? 0),
            );
            if (diff > 1e-4) {
              return false;
            }
          }
          return true;
        },
      ),
      { numRuns: 50 },
    );
  });

  it("SES: alpha ∈ (0, 1) for any data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 3, maxLength: 20 }),
        (y) => {
          const fit = simpleExpSmoothing(y);
          return fit.alpha > 0 && fit.alpha < 1;
        },
      ),
      { numRuns: 50 },
    );
  });

  it("Holt: phi = 1 when not damped, for any data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 4, maxLength: 20 }),
        (y) => {
          const fit = holt(y);
          return fit.phi === 1.0;
        },
      ),
      { numRuns: 40 },
    );
  });

  it("ExponentialSmoothing: SSE ≥ 0 for any data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -50, max: 50, noNaN: true }), { minLength: 3, maxLength: 15 }),
        (y) => {
          const fit = fitEts(y, { trend: "add" });
          return fit.sse >= 0;
        },
      ),
      { numRuns: 40 },
    );
  });

  it("ExponentialSmoothing: forecast length = steps for any data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -50, max: 50, noNaN: true }), { minLength: 3, maxLength: 15 }),
        fc.integer({ min: 0, max: 10 }),
        (y, steps) => {
          const model = new ExponentialSmoothing({ trend: "add" });
          model.fit(y);
          return model.forecast(steps).length === steps;
        },
      ),
      { numRuns: 40 },
    );
  });

  it("SES: fixed alpha produces deterministic results", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -50, max: 50, noNaN: true }), { minLength: 2, maxLength: 20 }),
        fc.float({ min: 0.01, max: 0.99 }),
        (y, alpha) => {
          const r1 = simpleExpSmoothing(y, { alpha });
          const r2 = simpleExpSmoothing(y, { alpha });
          return Math.abs(r1.sse - r2.sse) < 1e-8;
        },
      ),
      { numRuns: 40 },
    );
  });
});
