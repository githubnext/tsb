import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { mannWhitneyU, wilcoxonSigned } from "../../src/stats/mann_whitney.ts";

describe("mannWhitneyU", () => {
  it("detects significant difference between separated groups", () => {
    const result = mannWhitneyU([1, 2, 3], [7, 8, 9]);
    expect(result.u1).toBe(0);
    expect(result.u2).toBe(9);
    expect(result.statistic).toBe(0);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("returns non-significant for identical groups", () => {
    const result = mannWhitneyU([5, 5, 5], [5, 5, 5]);
    expect(result.pValue).toBeGreaterThan(0.9);
  });

  it("U1 + U2 equals n1 * n2", () => {
    const result = mannWhitneyU([1, 3, 5], [2, 4, 6]);
    expect(result.u1 + result.u2).toBe(9);
  });

  it("throws on empty samples", () => {
    expect(() => mannWhitneyU([], [1, 2])).toThrow();
    expect(() => mannWhitneyU([1, 2], [])).toThrow();
  });

  it("p-value is in [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 1, maxLength: 15 }),
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 1, maxLength: 15 }),
        (a, b) => {
          const result = mannWhitneyU(a, b);
          return result.pValue >= 0 && result.pValue <= 1;
        },
      ),
    );
  });

  it("U is non-negative and ≤ n1*n2", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 1, maxLength: 10 }),
        (a, b) => {
          const result = mannWhitneyU(a, b);
          const maxU = a.length * b.length;
          return result.statistic >= 0 && result.statistic <= maxU;
        },
      ),
    );
  });

  it("statistic is symmetric: U is the same regardless of group order", () => {
    const a = [1, 3, 5, 7];
    const b = [2, 4, 6, 8];
    const r1 = mannWhitneyU(a, b);
    const r2 = mannWhitneyU(b, a);
    // Both have statistic = min(U1,U2), should be equal
    expect(r1.statistic).toBe(r2.statistic);
  });
});

describe("wilcoxonSigned", () => {
  it("detects significant difference in paired samples", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 3, 4, 5, 6]; // each y > x by 1
    const result = wilcoxonSigned(x, y);
    expect(result.wPlus).toBe(0);
    expect(result.statistic).toBe(0);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("returns p=1 when all differences are zero", () => {
    const result = wilcoxonSigned([1, 2, 3], [1, 2, 3]);
    expect(result.statistic).toBe(0);
    expect(result.pValue).toBe(1);
  });

  it("throws on unequal-length arrays", () => {
    expect(() => wilcoxonSigned([1, 2, 3], [1, 2])).toThrow();
  });

  it("throws on empty arrays", () => {
    expect(() => wilcoxonSigned([], [])).toThrow();
  });

  it("W+ + W- equals n*(n+1)/2 for the non-zero differences", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 1, 7, 3];
    const result = wilcoxonSigned(x, y);
    // 5 non-zero differences → rank sum = 15
    expect(result.wPlus + result.wMinus).toBeCloseTo(15, 5);
  });

  it("p-value is in [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 1, maxLength: 20 }),
        (xs) => {
          const ys = xs.map((v) => v + 1);
          const result = wilcoxonSigned(xs, ys);
          return result.pValue >= 0 && result.pValue <= 1;
        },
      ),
    );
  });
});
