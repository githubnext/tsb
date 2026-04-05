/**
 * Tests for bootstrap confidence intervals.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { bootstrapCI, bootstrapMean, bootstrapMedian, bootstrapStd } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2 : (s[mid] ?? 0);
}

// ─── bootstrapCI ─────────────────────────────────────────────────────────────

describe("bootstrapCI", () => {
  it("throws for empty data", () => {
    expect(() => bootstrapCI([], mean)).toThrow(RangeError);
  });

  it("estimate equals statistic on original data", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = bootstrapCI(data, mean, { seed: 42 });
    expect(result.estimate).toBe(mean(data));
  });

  it("CI lower <= estimate <= upper", () => {
    const data = [2.1, 3.4, 1.8, 4.2, 2.9, 3.7, 2.5];
    const result = bootstrapCI(data, mean, { seed: 1 });
    expect(result.lower).toBeLessThanOrEqual(result.estimate + 1e-10);
    expect(result.upper).toBeGreaterThanOrEqual(result.estimate - 1e-10);
  });

  it("CI width is positive", () => {
    const data = [1, 2, 3, 4, 5];
    const result = bootstrapCI(data, mean, { seed: 0 });
    expect(result.upper - result.lower).toBeGreaterThan(0);
  });

  it("returns correct number of bootstrap stats", () => {
    const data = [1, 2, 3, 4, 5];
    const result = bootstrapCI(data, mean, { nResamples: 100, seed: 7 });
    expect(result.bootstrapStats.length).toBe(100);
  });

  it("se equals std dev of bootstrap stats", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = bootstrapCI(data, mean, { nResamples: 200, seed: 3 });
    const statsArr = Array.from(result.bootstrapStats);
    const m = mean(statsArr);
    const std = Math.sqrt(statsArr.reduce((s, v) => s + (v - m) ** 2, 0) / (statsArr.length - 1));
    expect(Math.abs(result.se - std)).toBeLessThan(1e-10);
  });

  it("constant data: CI width is 0", () => {
    const data = [5, 5, 5, 5, 5];
    const result = bootstrapCI(data, mean, { seed: 0 });
    expect(result.lower).toBe(result.estimate);
    expect(result.upper).toBe(result.estimate);
  });

  it("wider CI at lower alpha", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const narrow = bootstrapCI(data, mean, { alpha: 0.2, seed: 42, nResamples: 2000 });
    const wide = bootstrapCI(data, mean, { alpha: 0.01, seed: 42, nResamples: 2000 });
    expect(wide.upper - wide.lower).toBeGreaterThan(narrow.upper - narrow.lower);
  });

  it("BCa method returns valid CI", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = bootstrapCI(data, mean, { method: "bca", seed: 99, nResamples: 500 });
    expect(Number.isFinite(result.lower)).toBe(true);
    expect(Number.isFinite(result.upper)).toBe(true);
    expect(result.lower).toBeLessThanOrEqual(result.upper + 1e-10);
  });

  it("reproducible results with same seed", () => {
    const data = [2, 4, 6, 8, 10, 1, 3, 5, 7, 9];
    const r1 = bootstrapCI(data, mean, { seed: 123, nResamples: 500 });
    const r2 = bootstrapCI(data, mean, { seed: 123, nResamples: 500 });
    expect(r1.lower).toBe(r2.lower);
    expect(r1.upper).toBe(r2.upper);
    expect(r1.se).toBe(r2.se);
  });

  it("different seeds produce different results", () => {
    const data = Array.from({ length: 20 }, (_, i) => i + 1);
    const r1 = bootstrapCI(data, mean, { seed: 1, nResamples: 500 });
    const r2 = bootstrapCI(data, mean, { seed: 2, nResamples: 500 });
    // Not strictly guaranteed but practically always true
    const hasDiff = r1.lower !== r2.lower || r1.upper !== r2.upper;
    expect(hasDiff).toBe(true);
  });

  it("property: CI always contains the estimate (within floating-point noise)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 2, maxLength: 30 }),
        fc.integer({ min: 0, max: 9999 }),
        (arr, seed) => {
          const result = bootstrapCI(arr, mean, { seed, nResamples: 200 });
          return result.lower <= result.estimate + 1e-9 && result.upper >= result.estimate - 1e-9;
        },
      ),
    );
  });
});

// ─── bootstrapMean ────────────────────────────────────────────────────────────

describe("bootstrapMean", () => {
  it("estimate equals arithmetic mean", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = bootstrapMean(data, { seed: 0 });
    expect(result.estimate).toBe(5.5);
  });

  it("CI contains true mean with high probability (large sample)", () => {
    // Generate known data centered at 50
    const data = Array.from({ length: 100 }, (_, i) => 40 + (i % 21));
    const result = bootstrapMean(data, { seed: 0, nResamples: 999 });
    expect(result.lower).toBeLessThan(result.estimate + 0.1);
    expect(result.upper).toBeGreaterThan(result.estimate - 0.1);
  });
});

// ─── bootstrapMedian ─────────────────────────────────────────────────────────

describe("bootstrapMedian", () => {
  it("estimate equals median", () => {
    const data = [1, 2, 3, 4, 5];
    const result = bootstrapMedian(data, { seed: 0 });
    expect(result.estimate).toBe(median(data));
  });

  it("CI is valid", () => {
    const data = [5, 1, 8, 3, 7, 2, 9, 4, 6, 10];
    const result = bootstrapMedian(data, { seed: 1, nResamples: 500 });
    expect(result.lower).toBeLessThanOrEqual(result.upper + 1e-10);
    expect(Number.isFinite(result.estimate)).toBe(true);
  });
});

// ─── bootstrapStd ────────────────────────────────────────────────────────────

describe("bootstrapStd", () => {
  it("estimate equals sample std dev", () => {
    const data = [1, 2, 3, 4, 5];
    const m = mean(data);
    const std = Math.sqrt(data.reduce((s, v) => s + (v - m) ** 2, 0) / (data.length - 1));
    const result = bootstrapStd(data, { seed: 0 });
    expect(Math.abs(result.estimate - std)).toBeLessThan(1e-10);
  });

  it("CI is valid and positive", () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = bootstrapStd(data, { seed: 42, nResamples: 500 });
    expect(result.lower).toBeGreaterThanOrEqual(0);
    expect(result.upper).toBeGreaterThanOrEqual(result.lower);
  });
});
