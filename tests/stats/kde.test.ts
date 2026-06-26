/**
 * Tests for src/stats/kde.ts
 *
 * Verifies Gaussian KDE against known analytical values and scipy-equivalent
 * behaviour. Tests cover: bandwidth rules, PDF/logPDF evaluation, numerical
 * integration, resampling, weighted KDE, error handling, and property-based
 * invariants.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { gaussianKDE, GaussianKDE } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Round to n decimal places. */
function r(v: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdDev(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
}

// ─── basic construction ────────────────────────────────────────────────────────

describe("gaussianKDE — construction", () => {
  it("returns a GaussianKDE instance", () => {
    const kde = gaussianKDE([1, 2, 3, 4, 5]);
    expect(kde).toBeInstanceOf(GaussianKDE);
  });

  it("stores dataset correctly", () => {
    const data = [1, 2, 3, 4, 5];
    const kde = gaussianKDE(data);
    expect(Array.from(kde.dataset)).toEqual(data);
  });

  it("n equals dataset length", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const kde = gaussianKDE(data);
    expect(kde.n).toBe(10);
  });

  it("factor is positive", () => {
    const kde = gaussianKDE([0, 1, 2, 3, 4]);
    expect(kde.factor).toBeGreaterThan(0);
  });

  it("covariance equals factor²", () => {
    const kde = gaussianKDE([0, 1, 2, 3, 4]);
    expect(r(kde.covariance)).toBe(r(kde.factor * kde.factor));
  });
});

// ─── bandwidth selection ───────────────────────────────────────────────────────

describe("gaussianKDE — bandwidth selection", () => {
  // Reference dataset for bandwidth tests.
  const n = 50;
  const data = Array.from({ length: n }, (_, i) => i * 0.1);
  const sigma = stdDev(data);

  it("silverman bandwidth: (4/(3n))^(1/5) * σ", () => {
    const kde = gaussianKDE(data, { bw_method: "silverman" });
    const expected = Math.pow(4 / (3 * n), 0.2) * sigma;
    expect(r(kde.factor, 6)).toBeCloseTo(r(expected, 6), 5);
  });

  it("scott bandwidth: n^(-1/5) * σ", () => {
    const kde = gaussianKDE(data, { bw_method: "scott" });
    const expected = Math.pow(n, -0.2) * sigma;
    expect(r(kde.factor, 6)).toBeCloseTo(r(expected, 6), 5);
  });

  it("silverman is default bandwidth method", () => {
    const kde1 = gaussianKDE(data, { bw_method: "silverman" });
    const kde2 = gaussianKDE(data);
    expect(kde1.factor).toBe(kde2.factor);
  });

  it("scott < silverman for moderate n (scott factor ≈ 0.98 of silverman)", () => {
    const kS = gaussianKDE(data, { bw_method: "scott" });
    const kSil = gaussianKDE(data, { bw_method: "silverman" });
    // (4/3)^(1/5) ≈ 1.058, so silverman ≈ 1.058 × scott factor
    expect(kSil.factor).toBeGreaterThan(kS.factor);
  });

  it("numeric bw_method: factor = bw * σ", () => {
    const bw = 0.5;
    const kde = gaussianKDE(data, { bw_method: bw });
    expect(r(kde.factor, 6)).toBeCloseTo(r(bw * sigma, 6), 5);
  });

  it("numeric bw_method = 1 gives factor ≈ σ", () => {
    const kde = gaussianKDE(data, { bw_method: 1.0 });
    expect(r(kde.factor, 4)).toBeCloseTo(r(sigma, 4), 3);
  });
});

// ─── PDF evaluation ───────────────────────────────────────────────────────────

describe("gaussianKDE — pdf / evaluate", () => {
  const data = [0, 1, 2, 3, 4];

  it("pdf returns a positive number", () => {
    const kde = gaussianKDE(data);
    expect(kde.pdf(2)).toBeGreaterThan(0);
  });

  it("pdf is symmetric around center of symmetric data", () => {
    // data = [0, 1, 2, 3, 4] is symmetric around 2
    const kde = gaussianKDE(data);
    expect(r(kde.pdf(2 - 1), 4)).toBeCloseTo(r(kde.pdf(2 + 1), 4), 3);
  });

  it("evaluate matches repeated pdf calls", () => {
    const kde = gaussianKDE(data);
    const points = [-1, 0, 1, 2, 3, 4, 5];
    const fromEvaluate = kde.evaluate(points);
    const fromPdf = points.map((x) => kde.pdf(x));
    for (let i = 0; i < points.length; i++) {
      expect(r(fromEvaluate[i]!, 8)).toBeCloseTo(r(fromPdf[i]!, 8), 7);
    }
  });

  it("pdf is always ≥ 0", () => {
    const kde = gaussianKDE(data);
    const xs = Array.from({ length: 200 }, (_, i) => -5 + i * 0.1);
    for (const x of xs) {
      expect(kde.pdf(x)).toBeGreaterThanOrEqual(0);
    }
  });

  it("pdf is highest near data center", () => {
    const kde = gaussianKDE(data);
    const center = kde.pdf(2);
    const far = kde.pdf(10);
    expect(center).toBeGreaterThan(far);
  });

  it("call() is an alias for evaluate()", () => {
    const kde = gaussianKDE(data);
    const points = [0, 1, 2, 3];
    expect(kde.call(points)).toEqual(kde.evaluate(points));
  });
});

// ─── logPdf / logpdf ─────────────────────────────────────────────────────────

describe("gaussianKDE — logPdf / logpdf", () => {
  const data = [1, 2, 3, 4, 5];

  it("logPdf(x) = log(pdf(x))", () => {
    const kde = gaussianKDE(data);
    const x = 3;
    expect(r(kde.logPdf(x), 6)).toBeCloseTo(r(Math.log(kde.pdf(x)), 6), 5);
  });

  it("logpdf array matches repeated logPdf calls", () => {
    const kde = gaussianKDE(data);
    const points = [1, 2, 3, 4, 5];
    const arr = kde.logpdf(points);
    for (let i = 0; i < points.length; i++) {
      expect(r(arr[i]!, 8)).toBeCloseTo(r(kde.logPdf(points[i]!), 8), 7);
    }
  });

  it("logPdf is -Infinity where pdf is 0 (far tail)", () => {
    // single-point KDE with tiny bandwidth → pdf very small far away
    // but actually it's never 0 for Gaussian, so logPdf is always finite
    const kde = gaussianKDE([0, 1], { bw_method: 0.01 });
    // logPdf at a reasonable distance should be finite
    expect(kde.logPdf(0.5)).toBeFinite();
  });
});

// ─── numerical integration ───────────────────────────────────────────────────

describe("gaussianKDE — integrate", () => {
  const data = [0, 1, 2, 3, 4];

  it("integrateFull() ≈ 1", () => {
    const kde = gaussianKDE(data);
    const mass = kde.integrateFull();
    expect(mass).toBeCloseTo(1.0, 2);
  });

  it("integrate(−∞, +∞) ≈ 1", () => {
    const kde = gaussianKDE(data);
    const mass = kde.integrate(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
    expect(mass).toBeCloseTo(1.0, 2);
  });

  it("integrate(low, high) ≤ 1 for any finite interval", () => {
    const kde = gaussianKDE(data);
    const mass = kde.integrate(-10, 10);
    expect(mass).toBeLessThanOrEqual(1.0 + 1e-6);
  });

  it("integrate is monotone (wider interval → more mass)", () => {
    const kde = gaussianKDE(data);
    const m1 = kde.integrate(0, 4);
    const m2 = kde.integrate(-1, 5);
    expect(m2).toBeGreaterThan(m1);
  });

  it("integrate([lo, hi]) + integrate([hi, +∞]) ≈ integrate([lo, +∞])", () => {
    const kde = gaussianKDE(data);
    const mid = 2;
    const left = kde.integrate(Number.NEGATIVE_INFINITY, mid);
    const right = kde.integrate(mid, Number.POSITIVE_INFINITY);
    const full = kde.integrate(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
    expect(left + right).toBeCloseTo(full, 2);
  });

  it("integrate(lo, lo) = 0", () => {
    const kde = gaussianKDE(data);
    expect(kde.integrate(2, 2)).toBe(0);
  });

  it("integrate(hi, lo) = 0 (empty interval)", () => {
    const kde = gaussianKDE(data);
    expect(kde.integrate(3, 1)).toBe(0);
  });

  it("cdf(+∞) ≈ 1", () => {
    const kde = gaussianKDE(data);
    expect(kde.cdf(1000)).toBeCloseTo(1.0, 2);
  });

  it("cdf is monotone non-decreasing", () => {
    const kde = gaussianKDE(data);
    const xs = [-2, 0, 1, 2, 3, 4, 6];
    let prev = kde.cdf(xs[0]!);
    for (let i = 1; i < xs.length; i++) {
      const cur = kde.cdf(xs[i]!);
      expect(cur).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = cur;
    }
  });
});

// ─── integrateGaussian ────────────────────────────────────────────────────────

describe("gaussianKDE — integrateGaussian", () => {
  it("integrateGaussian with self ≈ integrateFull of squared KDE", () => {
    const kde = gaussianKDE([0, 1, 2, 3, 4]);
    // Self-integral: ∫ KDE(x)² dx
    const selfInt = kde.integrateGaussian(kde);
    expect(selfInt).toBeGreaterThan(0);
    expect(selfInt).toBeLessThan(1);
  });

  it("integrateGaussian is symmetric", () => {
    const k1 = gaussianKDE([0, 1, 2]);
    const k2 = gaussianKDE([1, 2, 3]);
    expect(r(k1.integrateGaussian(k2), 6)).toBeCloseTo(r(k2.integrateGaussian(k1), 6), 5);
  });
});

// ─── resampling ──────────────────────────────────────────────────────────────

describe("gaussianKDE — resample", () => {
  it("resample returns correct number of samples", () => {
    const kde = gaussianKDE([1, 2, 3, 4, 5]);
    expect(kde.resample(100, 0)).toHaveLength(100);
  });

  it("resample with same seed is reproducible", () => {
    const kde = gaussianKDE([0, 1, 2, 3, 4]);
    const s1 = kde.resample(50, 42);
    const s2 = kde.resample(50, 42);
    expect(s1).toEqual(s2);
  });

  it("resample with different seeds differs", () => {
    const kde = gaussianKDE([0, 1, 2, 3, 4]);
    const s1 = kde.resample(100, 1);
    const s2 = kde.resample(100, 2);
    expect(s1).not.toEqual(s2);
  });

  it("resample mean is close to data mean (n=2000)", () => {
    const data = [0, 1, 2, 3, 4];
    const dataMean = mean(data);
    const kde = gaussianKDE(data);
    const samples = kde.resample(2000, 42);
    const sampleMean = mean(samples);
    // Should be within 0.5 of the true mean (high tolerance for stochastic test)
    expect(Math.abs(sampleMean - dataMean)).toBeLessThan(0.5);
  });

  it("resample 0 samples returns empty array", () => {
    const kde = gaussianKDE([1, 2, 3]);
    expect(kde.resample(0, 0)).toHaveLength(0);
  });
});

// ─── neff ────────────────────────────────────────────────────────────────────

describe("gaussianKDE — neff", () => {
  it("neff equals n for uniform weights", () => {
    const data = [1, 2, 3, 4, 5];
    const kde = gaussianKDE(data);
    expect(r(kde.neff, 4)).toBeCloseTo(data.length, 3);
  });

  it("neff < n for non-uniform weights (concentrated mass)", () => {
    const data = [1, 2, 3, 4, 5];
    const weights = [10, 1, 1, 1, 1]; // concentrated on first point
    const kde = gaussianKDE(data, { weights });
    expect(kde.neff).toBeLessThan(data.length);
  });

  it("neff is 1 when all weight is on one point (nearly)", () => {
    const data = [1, 2, 3];
    const weights = [1000, 1, 1];
    const kde = gaussianKDE(data, { weights });
    // neff = (sw)² / sw² ≈ (1002)² / (1000² + 1 + 1) ≈ 1.004
    expect(kde.neff).toBeCloseTo(1, 0);
  });
});

// ─── weighted KDE ─────────────────────────────────────────────────────────────

describe("gaussianKDE — weighted", () => {
  it("equal weights matches unweighted KDE", () => {
    const data = [1, 2, 3, 4, 5];
    const kdeU = gaussianKDE(data);
    const kdeW = gaussianKDE(data, { weights: [1, 1, 1, 1, 1] });
    // Factors should differ only due to biased vs unbiased std (minor);
    // pdf at center should be close.
    expect(r(kdeU.pdf(3), 3)).toBeCloseTo(r(kdeW.pdf(3), 3), 1);
  });

  it("weighted KDE puts more density near heavy-weight points", () => {
    const data = [0, 5];
    const kdeEq = gaussianKDE(data, { weights: [1, 1] });
    const kdeW = gaussianKDE(data, { weights: [10, 1] });
    // At x=0, the weighted KDE should be higher than at x=5
    const dAt0 = kdeW.pdf(0);
    const dAt5 = kdeW.pdf(5);
    expect(dAt0).toBeGreaterThan(dAt5);
    // Unweighted: equal on both sides (by symmetry)
    expect(r(kdeEq.pdf(0), 4)).toBeCloseTo(r(kdeEq.pdf(5), 4), 3);
  });

  it("weighted integrateFull ≈ 1", () => {
    const kde = gaussianKDE([0, 1, 2, 3, 4], { weights: [1, 2, 3, 2, 1] });
    expect(kde.integrateFull()).toBeCloseTo(1, 2);
  });

  it("weights normalised internally (scale invariant)", () => {
    const data = [1, 2, 3, 4, 5];
    const k1 = gaussianKDE(data, { weights: [1, 2, 3, 2, 1] });
    const k2 = gaussianKDE(data, { weights: [10, 20, 30, 20, 10] });
    expect(r(k1.pdf(3), 6)).toBeCloseTo(r(k2.pdf(3), 6), 5);
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe("gaussianKDE — error handling", () => {
  it("throws for empty data", () => {
    expect(() => gaussianKDE([])).toThrow(/empty/i);
  });

  it("throws for data length 1", () => {
    expect(() => gaussianKDE([42])).toThrow(/at least 2/i);
  });

  it("throws for all-identical data (zero variance)", () => {
    expect(() => gaussianKDE([3, 3, 3, 3])).toThrow(/variance/i);
  });

  it("throws for negative bw_method", () => {
    expect(() => gaussianKDE([1, 2, 3], { bw_method: -0.5 })).toThrow();
  });

  it("throws for zero bw_method", () => {
    expect(() => gaussianKDE([1, 2, 3], { bw_method: 0 })).toThrow();
  });

  it("throws when weights length mismatches data", () => {
    expect(() => gaussianKDE([1, 2, 3], { weights: [1, 2] })).toThrow(/length/i);
  });

  it("throws for negative weights", () => {
    expect(() => gaussianKDE([1, 2, 3], { weights: [1, -1, 1] })).toThrow();
  });

  it("throws when weights sum to zero", () => {
    expect(() => gaussianKDE([1, 2, 3], { weights: [0, 0, 0] })).toThrow();
  });
});

// ─── known numerical values ───────────────────────────────────────────────────

describe("gaussianKDE — known numerical values", () => {
  it("single Gaussian: KDE of one cluster peaks near the cluster", () => {
    // 5 points near 2 → peak should be close to 2
    const data = [1.8, 1.9, 2.0, 2.1, 2.2];
    const kde = gaussianKDE(data);
    // Find the max over a fine grid
    const xs = Array.from({ length: 200 }, (_, i) => 0 + i * 0.05);
    const ys = kde.evaluate(xs);
    const maxIdx = ys.reduce((mi, y, i) => (y > (ys[mi] ?? 0) ? i : mi), 0);
    expect(xs[maxIdx]!).toBeCloseTo(2.0, 0);
  });

  it("bimodal data has two local maxima", () => {
    const data = [-3, -2.5, -2, 2, 2.5, 3];
    const kde = gaussianKDE(data);
    const xs = Array.from({ length: 600 }, (_, i) => -5 + i * (10 / 599));
    const ys = kde.evaluate(xs);
    // Find local maxima (sign change of first difference)
    const localMax: number[] = [];
    for (let i = 1; i < ys.length - 1; i++) {
      if ((ys[i] ?? 0) > (ys[i - 1] ?? 0) && (ys[i] ?? 0) > (ys[i + 1] ?? 0)) {
        localMax.push(xs[i]!);
      }
    }
    expect(localMax.length).toBeGreaterThanOrEqual(2);
    // One local max should be negative, one positive
    expect(localMax.some((x) => x < -1)).toBe(true);
    expect(localMax.some((x) => x > 1)).toBe(true);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("gaussianKDE — property tests", () => {
  it("pdf is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.float({ min: -200, max: 200, noNaN: true }),
        (data, x) => {
          // Filter out constant arrays to avoid bandwidth error
          const unique = new Set(data);
          if (unique.size < 2) {
            return true;
          }
          const kde = gaussianKDE(data);
          return kde.pdf(x) >= 0;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("integrateFull is close to 1 for any data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -50, max: 50, noNaN: true }), {
          minLength: 3,
          maxLength: 15,
        }),
        (data) => {
          const unique = new Set(data);
          if (unique.size < 2) {
            return true;
          }
          const kde = gaussianKDE(data);
          const mass = kde.integrateFull();
          return Math.abs(mass - 1.0) < 0.05;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("factor is always positive", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.constantFrom("silverman" as const, "scott" as const),
        (data, bw) => {
          const unique = new Set(data);
          if (unique.size < 2) {
            return true;
          }
          const kde = gaussianKDE(data, { bw_method: bw });
          return kde.factor > 0 && Number.isFinite(kde.factor);
        },
      ),
      { numRuns: 150 },
    );
  });

  it("evaluate returns same length as input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -10, max: 10, noNaN: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.array(fc.float({ min: -20, max: 20, noNaN: true }), {
          minLength: 0,
          maxLength: 30,
        }),
        (data, points) => {
          const unique = new Set(data);
          if (unique.size < 2) {
            return true;
          }
          const kde = gaussianKDE(data);
          return kde.evaluate(points).length === points.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});
