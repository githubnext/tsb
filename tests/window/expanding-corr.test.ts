/**
 * Tests for expanding-corr — expandingCorr / expandingCov / expandingCorrDF / expandingCovDF.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  expandingCorr,
  expandingCorrDF,
  expandingCov,
  expandingCovDF,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isClose(a: number | null | undefined, b: number | null | undefined, eps = 1e-9): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }
  return Math.abs(a - b) < eps;
}

// ─── expandingCorr ────────────────────────────────────────────────────────────

describe("expandingCorr", () => {
  it("returns null for first element (insufficient pairs for correlation)", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [2, 4, 6, 8, 10] });
    const result = expandingCorr(x, y);
    expect(result.values[0]).toBeNull();
  });

  it("returns 1.0 for perfectly positively correlated series", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [2, 4, 6, 8, 10] });
    const vals = expandingCorr(x, y).values;
    // From index 1 onward all values should be 1.0
    for (let i = 1; i < 5; i++) {
      const v = vals[i];
      expect(typeof v === "number" && Math.abs(v - 1.0) < 1e-9).toBe(true);
    }
  });

  it("returns -1.0 for perfectly negatively correlated series", () => {
    const x = new Series({ data: [1, 2, 3, 4] });
    const y = new Series({ data: [4, 3, 2, 1] });
    const vals = expandingCorr(x, y).values;
    for (let i = 1; i < 4; i++) {
      const v = vals[i];
      expect(typeof v === "number" && Math.abs(v - -1.0) < 1e-9).toBe(true);
    }
  });

  it("returns NaN for constant series (zero variance)", () => {
    const x = new Series({ data: [3, 3, 3, 3] });
    const y = new Series({ data: [1, 2, 3, 4] });
    const vals = expandingCorr(x, y).values;
    for (let i = 1; i < 4; i++) {
      expect(Number.isNaN(vals[i] as number)).toBe(true);
    }
  });

  it("handles null values by excluding them from the calculation", () => {
    const x = new Series({ data: [1, null, 3, 4] });
    const y = new Series({ data: [2, null, 6, 8] });
    const vals = expandingCorr(x, y).values;
    // index 0: only 1 pair → null
    expect(vals[0]).toBeNull();
    // index 1: null in both, still only 1 pair → null
    expect(vals[1]).toBeNull();
    // index 2: pairs (1,2) and (3,6) → correlation should be 1.0
    const v2 = vals[2];
    expect(typeof v2 === "number" && Math.abs(v2 - 1.0) < 1e-9).toBe(true);
  });

  it("respects minPeriods parameter", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [2, 4, 6, 8, 10] });
    const vals = expandingCorr(x, y, 3).values;
    expect(vals[0]).toBeNull();
    expect(vals[1]).toBeNull();
    // index 2 has 3 pairs → should compute
    expect(vals[2]).not.toBeNull();
  });

  it("output has same length as shorter input series", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [1, 2, 3] });
    expect(expandingCorr(x, y).values.length).toBe(3);
  });

  it("property: expanding corr between identical series is always 1 or null", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 2, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          const vals = expandingCorr(s, s).values;
          for (let i = 1; i < vals.length; i++) {
            const v = vals[i];
            expect(
              v === null || Number.isNaN(v as number) || Math.abs((v as number) - 1.0) < 1e-9,
            ).toBe(true);
          }
        },
      ),
    );
  });

  it("result Series length equals series length", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 30 }), (arr) => {
        const s = new Series({ data: arr });
        expect(expandingCorr(s, s).values.length).toBe(arr.length);
      }),
    );
  });
});

// ─── expandingCov ─────────────────────────────────────────────────────────────

describe("expandingCov", () => {
  it("returns null for first element (n=1 < ddof+1=2)", () => {
    const x = new Series({ data: [1, 2, 3] });
    const y = new Series({ data: [4, 5, 6] });
    expect(expandingCov(x, y).values[0]).toBeNull();
  });

  it("computes sample covariance (ddof=1) incrementally", () => {
    const x = new Series({ data: [1, 2, 3] });
    const y = new Series({ data: [4, 5, 6] });
    const vals = expandingCov(x, y).values;
    // n=2: cov([1,2],[4,5]) = ((1-1.5)(4-4.5)+(2-1.5)(5-4.5)) / 1 = 0.25+0.25 = 0.5
    expect(isClose(vals[1], 0.5)).toBe(true);
    // n=3: cov([1,2,3],[4,5,6]) = 1.0
    expect(isClose(vals[2], 1.0)).toBe(true);
  });

  it("supports ddof=0 (population covariance)", () => {
    const x = new Series({ data: [1, 2, 3] });
    const y = new Series({ data: [4, 5, 6] });
    const vals = expandingCov(x, y, { ddof: 0 }).values;
    // n=2, pop cov: 0.25
    expect(isClose(vals[1], 0.25)).toBe(true);
  });

  it("covariance of series with itself equals variance", () => {
    const data = [1, 3, 2, 5, 4];
    const s = new Series({ data });
    const covVals = expandingCov(s, s).values;
    // At last index, cov(x,x) = var(x)
    const allVals = data.map((_, i) => {
      const sub = data.slice(0, i + 1).filter((v) => typeof v === "number");
      if (sub.length < 2) {
        return null;
      }
      const m = sub.reduce((a, b) => a + b) / sub.length;
      return sub.reduce((a, b) => a + (b - m) ** 2, 0) / (sub.length - 1);
    });
    for (let i = 1; i < data.length; i++) {
      expect(isClose(covVals[i], allVals[i])).toBe(true);
    }
  });

  it("property: cov length equals series length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          expect(expandingCov(s, s).values.length).toBe(arr.length);
        },
      ),
    );
  });
});

// ─── expandingCorrDF ──────────────────────────────────────────────────────────

describe("expandingCorrDF", () => {
  it("returns pairwise correlation DataFrame when no other provided", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [4, 3, 2, 1] });
    const corr = expandingCorrDF(df);
    // Should have columns a_a, a_b, b_a, b_b
    expect(corr.columns).toContain("a_a");
    expect(corr.columns).toContain("a_b");
    expect(corr.columns).toContain("b_a");
    expect(corr.columns).toContain("b_b");
    expect(corr.shape[0]).toBe(4);
  });

  it("a_a column should all be 1.0 or null (self-correlation)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    const corr = expandingCorrDF(df);
    const vals = corr.col("a_a").values;
    for (let i = 1; i < vals.length; i++) {
      const v = vals[i];
      expect(v === null || Number.isNaN(v as number) || Math.abs((v as number) - 1.0) < 1e-9).toBe(
        true,
      );
    }
  });

  it("correlates against `other` DataFrame when provided", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    const other = DataFrame.fromColumns({ a: [2, 4, 6, 8, 10] });
    const corr = expandingCorrDF(df, other);
    expect(corr.columns).toContain("a");
    // All non-null values should be 1.0 (perfect correlation)
    const vals = corr.col("a").values;
    for (let i = 1; i < vals.length; i++) {
      const v = vals[i];
      if (v !== null) {
        expect(Math.abs((v as number) - 1.0) < 1e-9).toBe(true);
      }
    }
  });
});

// ─── expandingCovDF ───────────────────────────────────────────────────────────

describe("expandingCovDF", () => {
  it("returns pairwise covariance DataFrame when no other provided", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3], y: [3, 2, 1] });
    const cov = expandingCovDF(df);
    expect(cov.columns).toContain("x_x");
    expect(cov.columns).toContain("x_y");
    expect(cov.shape[0]).toBe(3);
  });

  it("covariance of column with itself matches variance", () => {
    const df = DataFrame.fromColumns({ a: [2, 4, 6, 8] });
    const cov = expandingCovDF(df);
    const selfCov = cov.col("a_a").values;
    // n=2: var([2,4]) = 2.0
    const v1 = selfCov[1];
    expect(isClose(typeof v1 === "number" ? v1 : null, 2.0)).toBe(true);
  });

  it("covariation against `other` DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4] });
    const other = DataFrame.fromColumns({ a: [1, 2, 3, 4] });
    const cov = expandingCovDF(df, other);
    expect(cov.columns).toContain("a");
    expect(cov.shape[0]).toBe(4);
  });
});
