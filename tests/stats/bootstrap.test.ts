/**
 * Tests for src/stats/bootstrap.ts
 *
 * Verifies bootstrap and bootstrap1 against known values.
 * Tests percentile, basic, and BCa methods with seeded RNG.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { bootstrap, bootstrap1 } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  return s / xs.length;
}

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

function stdDev(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Round to n decimal places. */
function r(v: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

// ─── basic sanity ─────────────────────────────────────────────────────────────

describe("bootstrap — basic sanity", () => {
  const data = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  const trueMean = mean(data); // 11

  it("bootstrap1 returns CI containing the true mean", () => {
    const result = bootstrap1(data, mean, { n: 2000, seed: 42 });
    expect(result.confidenceInterval.low).toBeLessThan(trueMean);
    expect(result.confidenceInterval.high).toBeGreaterThan(trueMean);
  });

  it("bootstrap [[data]] is equivalent to bootstrap1", () => {
    const r1 = bootstrap([data], mean, { n: 500, seed: 99 });
    const r2 = bootstrap1(data, mean, { n: 500, seed: 99 });
    expect(r1.confidenceInterval.low).toBe(r2.confidenceInterval.low);
    expect(r1.confidenceInterval.high).toBe(r2.confidenceInterval.high);
  });

  it("bootDistribution has length n", () => {
    const result = bootstrap1(data, mean, { n: 300, seed: 1 });
    expect(result.bootDistribution.length).toBe(300);
  });

  it("standardError is positive", () => {
    const result = bootstrap1(data, mean, { n: 500, seed: 2 });
    expect(result.standardError).toBeGreaterThan(0);
  });

  it("CI low < high", () => {
    const result = bootstrap1(data, mean, { n: 500, seed: 3 });
    expect(result.confidenceInterval.low).toBeLessThan(result.confidenceInterval.high);
  });
});

// ─── percentile method ────────────────────────────────────────────────────────

describe("bootstrap — percentile method", () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("CI contains true mean", () => {
    const result = bootstrap1(data, mean, { n: 3000, seed: 7, method: "percentile" });
    const { low, high } = result.confidenceInterval;
    expect(low).toBeLessThan(5.5);
    expect(high).toBeGreaterThan(5.5);
  });

  it("95% CI is wider than 90% CI", () => {
    const r95 = bootstrap1(data, mean, {
      n: 2000,
      seed: 7,
      method: "percentile",
      confidence: 0.95,
    });
    const r90 = bootstrap1(data, mean, { n: 2000, seed: 7, method: "percentile", confidence: 0.9 });
    const width95 = r95.confidenceInterval.high - r95.confidenceInterval.low;
    const width90 = r90.confidenceInterval.high - r90.confidenceInterval.low;
    expect(width95).toBeGreaterThan(width90);
  });
});

// ─── basic method ─────────────────────────────────────────────────────────────

describe("bootstrap — basic (pivoting) method", () => {
  const data = [10, 20, 30, 40, 50, 60, 70];

  it("CI contains true mean", () => {
    const result = bootstrap1(data, mean, { n: 2000, seed: 13, method: "basic" });
    const { low, high } = result.confidenceInterval;
    expect(low).toBeLessThan(40);
    expect(high).toBeGreaterThan(40);
  });

  it("basic and percentile CIs differ", () => {
    const rPerc = bootstrap1(data, mean, { n: 2000, seed: 13, method: "percentile" });
    const rBasic = bootstrap1(data, mean, { n: 2000, seed: 13, method: "basic" });
    // They share the same boot dist but pivot differently
    expect(rPerc.confidenceInterval.low).not.toBe(rBasic.confidenceInterval.low);
  });
});

// ─── BCa method ───────────────────────────────────────────────────────────────

describe("bootstrap — BCa method", () => {
  const data = [3, 7, 11, 15, 19, 23, 27, 31];

  it("BCa CI contains the true mean", () => {
    const result = bootstrap1(data, mean, { n: 3000, seed: 55, method: "bca" });
    const { low, high } = result.confidenceInterval;
    expect(low).toBeLessThan(17);
    expect(high).toBeGreaterThan(17);
  });

  it("default method is BCa", () => {
    const rDefault = bootstrap1(data, mean, { n: 1000, seed: 55 });
    const rBca = bootstrap1(data, mean, { n: 1000, seed: 55, method: "bca" });
    expect(rDefault.confidenceInterval.low).toBe(rBca.confidenceInterval.low);
    expect(rDefault.confidenceInterval.high).toBe(rBca.confidenceInterval.high);
  });

  it("BCa CI for skewed data is different from percentile", () => {
    // Log-normal-like skewed data
    const skewed = [1, 1, 1, 1, 2, 2, 2, 5, 10, 50];
    const rBca = bootstrap1(skewed, mean, { n: 3000, seed: 77, method: "bca" });
    const rPerc = bootstrap1(skewed, mean, { n: 3000, seed: 77, method: "percentile" });
    // For skewed data BCa should adjust (different results)
    const eq =
      r(rBca.confidenceInterval.low) === r(rPerc.confidenceInterval.low) &&
      r(rBca.confidenceInterval.high) === r(rPerc.confidenceInterval.high);
    expect(eq).toBe(false);
  });
});

// ─── two-sample bootstrap ─────────────────────────────────────────────────────

describe("bootstrap — two-sample", () => {
  const a = [10, 12, 14, 16, 18];
  const b = [8, 9, 10, 11, 12];

  it("mean difference CI contains true difference", () => {
    const trueDiff = mean(a) - mean(b); // 14 - 10 = 4
    const result = bootstrap([a, b], (xs, ys) => mean(xs) - mean(ys), { n: 2000, seed: 88 });
    const { low, high } = result.confidenceInterval;
    expect(low).toBeLessThan(trueDiff);
    expect(high).toBeGreaterThan(trueDiff);
  });

  it("two-sample bootDistribution length equals n", () => {
    const result = bootstrap([a, b], (xs, ys) => mean(xs) - mean(ys), { n: 400, seed: 9 });
    expect(result.bootDistribution.length).toBe(400);
  });
});

// ─── statistics beyond mean ────────────────────────────────────────────────────

describe("bootstrap — various statistics", () => {
  const data = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

  it("CI for median contains true median", () => {
    const result = bootstrap1(data, median, { n: 3000, seed: 42, method: "percentile" });
    const { low, high } = result.confidenceInterval;
    expect(low).toBeLessThan(10);
    expect(high).toBeGreaterThan(10);
  });

  it("CI for std-dev is positive", () => {
    const result = bootstrap1(data, stdDev, { n: 2000, seed: 7 });
    expect(result.confidenceInterval.low).toBeGreaterThan(0);
    expect(result.confidenceInterval.high).toBeGreaterThan(0);
  });
});

// ─── seeded reproducibility ───────────────────────────────────────────────────

describe("bootstrap — reproducibility", () => {
  const data = [2, 4, 6, 8, 10];

  it("same seed → identical results", () => {
    const r1 = bootstrap1(data, mean, { n: 500, seed: 12345 });
    const r2 = bootstrap1(data, mean, { n: 500, seed: 12345 });
    expect(r1.confidenceInterval.low).toBe(r2.confidenceInterval.low);
    expect(r1.confidenceInterval.high).toBe(r2.confidenceInterval.high);
    expect(r1.standardError).toBe(r2.standardError);
  });

  it("different seeds → different distributions", () => {
    const r1 = bootstrap1(data, mean, { n: 500, seed: 1 });
    const r2 = bootstrap1(data, mean, { n: 500, seed: 2 });
    expect(r1.bootDistribution).not.toEqual(r2.bootDistribution);
  });
});

// ─── edge cases ───────────────────────────────────────────────────────────────

describe("bootstrap — edge cases", () => {
  it("single-element data returns tight CI", () => {
    const data = [5];
    const result = bootstrap1(data, mean, { n: 100, seed: 0 });
    // All resamples will be [5], so low = high = 5
    expect(result.confidenceInterval.low).toBe(5);
    expect(result.confidenceInterval.high).toBe(5);
    expect(result.standardError).toBe(0);
  });

  it("throws for invalid confidence", () => {
    expect(() => bootstrap1([1, 2], mean, { confidence: 1.5 })).toThrow(RangeError);
    expect(() => bootstrap1([1, 2], mean, { confidence: 0 })).toThrow(RangeError);
  });

  it("throws for n < 1", () => {
    expect(() => bootstrap1([1, 2], mean, { n: 0 })).toThrow(RangeError);
  });

  it("n=1 still works", () => {
    const result = bootstrap1([1, 2, 3], mean, { n: 1, seed: 0 });
    expect(result.bootDistribution.length).toBe(1);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("bootstrap — property-based", () => {
  it("CI always has low ≤ high", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 2, maxLength: 20 }),
        fc
          .integer({ min: 1, max: 3 })
          .map((x) => (["percentile", "basic", "bca"] as const)[x - 1]!),
        fc.integer({ min: 0, max: 99999 }),
        (data, method, seed) => {
          const result = bootstrap1(data, mean, { n: 200, seed, method });
          return result.confidenceInterval.low <= result.confidenceInterval.high;
        },
      ),
      { numRuns: 30 },
    );
  });

  it("standardError is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -50, max: 50, noNaN: true }), { minLength: 2, maxLength: 15 }),
        fc.integer({ min: 0, max: 99999 }),
        (data, seed) => {
          const result = bootstrap1(data, mean, { n: 100, seed, method: "percentile" });
          return result.standardError >= 0;
        },
      ),
      { numRuns: 30 },
    );
  });

  it("bootDistribution length always equals n", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 500 }),
        (data, n) => {
          const result = bootstrap1(data, mean, { n, seed: 0 });
          return result.bootDistribution.length === n;
        },
      ),
      { numRuns: 20 },
    );
  });
});
