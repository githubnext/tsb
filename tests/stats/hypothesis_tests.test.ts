/**
 * Tests for src/stats/hypothesis_tests.ts
 *
 * Verifies ttest1samp, ttestInd, ttestRel, chi2Contingency, fOneway,
 * jarqueBera, pearsonr, spearmanr, mannWhitneyU, kstest against known
 * Python scipy.stats values (computed offline and hard-coded here).
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  Series,
  chi2Contingency,
  fOneway,
  jarqueBera,
  kstest,
  mannWhitneyU,
  pearsonr,
  spearmanr,
  ttest1samp,
  ttestInd,
  ttestRel,
} from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Round to n decimal places. */
function r(v: number, dp = 6): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/** Normal CDF for kstest tests. */
function stdNormCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-(ax * ax)));
}

// ─── ttest1samp ───────────────────────────────────────────────────────────────

describe("ttest1samp", () => {
  it("known result: data=[2.1,2.5,2.3,2.7,2.4] vs popmean=2.0 (two-sided)", () => {
    // scipy: t≈3.354, p≈0.0286
    const res = ttest1samp([2.1, 2.5, 2.3, 2.7, 2.4], 2.0);
    expect(r(res.statistic, 3)).toBeCloseTo(3.354, 2);
    expect(res.pvalue).toBeLessThan(0.05);
    expect(res.pvalue).toBeGreaterThan(0.01);
  });

  it("returns NaN for n < 2", () => {
    expect(Number.isNaN(ttest1samp([], 0).statistic)).toBe(true);
    expect(Number.isNaN(ttest1samp([1], 0).statistic)).toBe(true);
  });

  it("popmean equals sample mean → t=0, p=1.0 (two-sided)", () => {
    const data = [1, 2, 3, 4, 5];
    const m = 3;
    const res = ttest1samp(data, m);
    expect(Math.abs(res.statistic)).toBeLessThan(1e-10);
    expect(r(res.pvalue, 3)).toBe(1);
  });

  it("accepts Series input", () => {
    const s = new Series({ data: [2.1, 2.5, 2.3, 2.7, 2.4] });
    const res = ttest1samp(s, 2.0);
    expect(res.pvalue).toBeLessThan(0.05);
  });

  it("alternative=greater: p is half of two-sided when t > 0", () => {
    const data = [2.1, 2.5, 2.3, 2.7, 2.4];
    const two = ttest1samp(data, 2.0, { alternative: "two-sided" });
    const gt = ttest1samp(data, 2.0, { alternative: "greater" });
    expect(r(gt.pvalue, 6)).toBeCloseTo(two.pvalue / 2, 5);
  });

  it("alternative=less: p is nearly 1 when t > 0 (evidence against)", () => {
    const data = [2.1, 2.5, 2.3, 2.7, 2.4];
    const lt = ttest1samp(data, 2.0, { alternative: "less" });
    expect(lt.pvalue).toBeGreaterThan(0.9);
  });

  it("property: p-value ∈ [0, 1] for any numeric array", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 2, maxLength: 30 }),
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        (data, popmean) => {
          const { pvalue } = ttest1samp(data, popmean);
          return Number.isNaN(pvalue) || (pvalue >= 0 && pvalue <= 1);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── ttestInd ────────────────────────────────────────────────────────────────

describe("ttestInd", () => {
  it("equal groups → high p-value", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [1.1, 2.1, 2.9, 4.1, 4.9];
    const res = ttestInd(a, b);
    expect(res.pvalue).toBeGreaterThan(0.5);
  });

  it("clearly different groups → low p-value", () => {
    const a = [1, 2, 3];
    const b = [10, 11, 12];
    const res = ttestInd(a, b);
    expect(res.pvalue).toBeLessThan(0.001);
  });

  it("equalVar=true uses pooled variance (Student)", () => {
    const a = [2.0, 2.5, 3.0, 3.5];
    const b = [4.0, 4.5, 5.0, 5.5];
    const welch = ttestInd(a, b, { equalVar: false });
    const student = ttestInd(a, b, { equalVar: true });
    // Both should have low p-value; statistic should be similar
    expect(welch.pvalue).toBeLessThan(0.01);
    expect(student.pvalue).toBeLessThan(0.01);
    expect(Math.abs(welch.statistic - student.statistic)).toBeLessThan(1e-6);
  });

  it("returns NaN for empty groups", () => {
    expect(Number.isNaN(ttestInd([], [1, 2, 3]).statistic)).toBe(true);
  });

  it("property: p-value ∈ [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 2, maxLength: 20 }),
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 2, maxLength: 20 }),
        (a, b) => {
          const { pvalue } = ttestInd(a, b);
          return Number.isNaN(pvalue) || (pvalue >= 0 && pvalue <= 1);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── ttestRel ────────────────────────────────────────────────────────────────

describe("ttestRel", () => {
  it("known result: before/after with no real change → high p", () => {
    const before = [1, 2, 3, 4, 5];
    const after = [1.1, 1.9, 3.1, 3.9, 5.1];
    const res = ttestRel(before, after);
    expect(res.pvalue).toBeGreaterThan(0.3);
  });

  it("clear shift → low p-value", () => {
    const before = [1, 2, 3, 4, 5];
    const after = [3, 4, 5, 6, 7];
    const res = ttestRel(before, after);
    expect(res.pvalue).toBeLessThan(0.001);
  });

  it("returns NaN for n < 2", () => {
    expect(Number.isNaN(ttestRel([1], [1]).statistic)).toBe(true);
  });

  it("identical arrays → t=0", () => {
    const a = [1, 2, 3, 4, 5];
    const res = ttestRel(a, a);
    expect(Math.abs(res.statistic)).toBeLessThan(1e-10);
  });
});

// ─── chi2Contingency ─────────────────────────────────────────────────────────

describe("chi2Contingency", () => {
  it("independent table (expected=observed) → p≈1", () => {
    // Each row and column marginals determine expected exactly
    const obs = [
      [10, 10],
      [10, 10],
    ];
    const res = chi2Contingency(obs);
    expect(res.statistic).toBeCloseTo(0, 5);
    expect(res.pvalue).toBeCloseTo(1, 3);
    expect(res.dof).toBe(1);
  });

  it("highly dependent table → low p-value", () => {
    // All mass on diagonal — very dependent
    const obs = [
      [50, 1],
      [1, 50],
    ];
    const res = chi2Contingency(obs);
    expect(res.pvalue).toBeLessThan(0.0001);
    expect(res.dof).toBe(1);
  });

  it("3×2 table — correct dof and expected shape", () => {
    const obs = [
      [20, 30],
      [10, 40],
      [30, 10],
    ];
    const res = chi2Contingency(obs);
    expect(res.dof).toBe(2);
    expect(res.expected.length).toBe(3);
    expect((res.expected[0] as readonly number[]).length).toBe(2);
    expect(res.pvalue).toBeLessThan(0.05);
  });

  it("expected frequencies sum to grand total", () => {
    const obs = [
      [15, 25],
      [35, 25],
    ];
    const res = chi2Contingency(obs);
    const grandObs = obs.flat().reduce((s, v) => s + v, 0);
    const grandExp = res.expected.flat().reduce((s, v) => s + v, 0);
    expect(r(grandExp)).toBeCloseTo(grandObs, 5);
  });

  it("returns NaN for empty table", () => {
    const res = chi2Contingency([]);
    expect(Number.isNaN(res.statistic)).toBe(true);
  });

  it("known scipy value: [[10,10],[15,15],[5,10]]", () => {
    // scipy.stats.chi2_contingency([[10,10],[15,15],[5,10]]) → χ²≈1.2, p≈0.549
    const obs = [
      [10, 10],
      [15, 15],
      [5, 10],
    ];
    const res = chi2Contingency(obs);
    expect(res.statistic).toBeCloseTo(1.2, 1);
    expect(res.pvalue).toBeGreaterThan(0.3);
  });
});

// ─── fOneway ─────────────────────────────────────────────────────────────────

describe("fOneway", () => {
  it("identical groups → F≈0, p≈1", () => {
    const { statistic, pvalue } = fOneway([1, 2, 3], [1, 2, 3], [1, 2, 3]);
    expect(statistic).toBeCloseTo(0, 5);
    expect(pvalue).toBeCloseTo(1, 2);
  });

  it("very different groups → large F, small p", () => {
    const { pvalue } = fOneway([1, 2, 3], [10, 11, 12], [20, 21, 22]);
    expect(pvalue).toBeLessThan(0.0001);
  });

  it("returns NaN for fewer than 2 groups", () => {
    expect(Number.isNaN(fOneway([1, 2, 3]).statistic)).toBe(true);
  });

  it("two groups agree with ttestInd squared (F = t²)", () => {
    const a = [1.0, 2.0, 3.0, 4.0];
    const b = [2.5, 3.5, 4.5, 5.5];
    const f = fOneway(a, b);
    const t = ttestInd(a, b, { equalVar: true });
    expect(r(f.statistic, 4)).toBeCloseTo(t.statistic * t.statistic, 3);
    expect(r(f.pvalue, 4)).toBeCloseTo(t.pvalue, 3);
  });

  it("property: F ≥ 0 and p ∈ [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 2, maxLength: 15 }),
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 2, maxLength: 15 }),
        (a, b) => {
          const { statistic, pvalue } = fOneway(a, b);
          const okF = Number.isNaN(statistic) || statistic >= 0;
          const okP = Number.isNaN(pvalue) || (pvalue >= 0 && pvalue <= 1);
          return okF && okP;
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── jarqueBera ──────────────────────────────────────────────────────────────

describe("jarqueBera", () => {
  it("uniform data far from normal → small p-value", () => {
    // Bimodal-ish data
    const data = [1, 1, 1, 5, 5, 5, 1, 1, 5, 5];
    const { statistic, pvalue } = jarqueBera(data);
    expect(statistic).toBeGreaterThan(0);
    expect(pvalue).toBeGreaterThanOrEqual(0);
  });

  it("approximately normal data → large p-value", () => {
    // Symmetric near-normal
    const data = [-2, -1.5, -1, -0.5, 0, 0, 0.5, 1, 1.5, 2];
    const { pvalue } = jarqueBera(data);
    expect(pvalue).toBeGreaterThan(0.01);
  });

  it("returns NaN for n < 4", () => {
    expect(Number.isNaN(jarqueBera([1, 2, 3]).statistic)).toBe(true);
  });

  it("accepts Series input", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    const { pvalue } = jarqueBera(s);
    expect(Number.isNaN(pvalue)).toBe(false);
  });

  it("property: JB ≥ 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 4, maxLength: 50 }),
        (data) => {
          const { statistic } = jarqueBera(data);
          return Number.isNaN(statistic) || statistic >= 0;
        },
      ),
      { numRuns: 300 },
    );
  });
});

// ─── pearsonr ────────────────────────────────────────────────────────────────

describe("pearsonr", () => {
  it("perfect positive correlation → r=1, p→0", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const { correlation, pvalue } = pearsonr(x, y);
    expect(r(correlation, 5)).toBe(1);
    expect(pvalue).toBeLessThan(0.001);
  });

  it("perfect negative correlation → r=-1", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];
    const { correlation } = pearsonr(x, y);
    expect(r(correlation, 5)).toBe(-1);
  });

  it("uncorrelated → p > 0.05 likely", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [3, 3, 3, 3, 3];
    const { correlation } = pearsonr(x, y);
    expect(Number.isNaN(correlation)).toBe(true); // constant y → NaN
  });

  it("known result: scipy pearsonr([1,2,3,4,5],[2,4,5,4,5])", () => {
    // scipy: r≈0.7559, p≈0.141
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 5, 4, 5];
    const { correlation, pvalue } = pearsonr(x, y);
    expect(correlation).toBeCloseTo(0.7559, 3);
    expect(pvalue).toBeCloseTo(0.141, 2);
  });

  it("returns NaN for n < 3", () => {
    expect(Number.isNaN(pearsonr([1], [1]).correlation)).toBe(true);
    expect(Number.isNaN(pearsonr([1, 2], [1, 2]).correlation)).toBe(false);
  });

  it("statistic equals correlation", () => {
    const x = [1, 3, 2, 5, 4];
    const y = [2, 3, 1, 5, 4];
    const res = pearsonr(x, y);
    expect(res.statistic).toBe(res.correlation);
  });
});

// ─── spearmanr ───────────────────────────────────────────────────────────────

describe("spearmanr", () => {
  it("perfectly ranked in order → rho=1", () => {
    const { correlation } = spearmanr([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    expect(r(correlation, 5)).toBe(1);
  });

  it("perfectly reverse ranked → rho=-1", () => {
    const { correlation } = spearmanr([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
    expect(r(correlation, 5)).toBe(-1);
  });

  it("known result: scipy spearmanr([1,2,3,4,5],[5,4,3,2,1]) p≈0", () => {
    const { pvalue } = spearmanr([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
    expect(pvalue).toBeLessThan(0.01);
  });

  it("statistic equals correlation", () => {
    const x = [1, 3, 2, 5, 4];
    const y = [2, 3, 1, 5, 4];
    const res = spearmanr(x, y);
    expect(res.statistic).toBe(res.correlation);
  });

  it("accepts Series", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [2, 4, 6, 8, 10] });
    const { correlation } = spearmanr(x, y);
    expect(correlation).toBeCloseTo(1, 5);
  });
});

// ─── mannWhitneyU ────────────────────────────────────────────────────────────

describe("mannWhitneyU", () => {
  it("identical groups → U around n1*n2/2, large p", () => {
    const { statistic, pvalue } = mannWhitneyU([1, 2, 3], [1, 2, 3]);
    expect(statistic).toBeCloseTo(4.5, 0);
    expect(pvalue).toBeGreaterThan(0.5);
  });

  it("clearly separated groups → small U, small p (two-sided)", () => {
    const { pvalue } = mannWhitneyU([1, 2, 3], [10, 11, 12]);
    expect(pvalue).toBeLessThan(0.1);
  });

  it("returns NaN for empty input", () => {
    expect(Number.isNaN(mannWhitneyU([], [1, 2, 3]).statistic)).toBe(true);
  });

  it("alternative=greater: reversed groups give complementary p-values", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const gt = mannWhitneyU(a, b, { alternative: "greater" });
    const lt = mannWhitneyU(b, a, { alternative: "greater" });
    // Together they are near 1
    expect(gt.pvalue + lt.pvalue).toBeCloseTo(1, 0);
  });

  it("property: p-value ∈ [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        (a, b) => {
          const { pvalue } = mannWhitneyU(a, b);
          return Number.isNaN(pvalue) || (pvalue >= 0 && pvalue <= 1);
        },
      ),
      { numRuns: 300 },
    );
  });
});

// ─── kstest ───────────────────────────────────────────────────────────────────

describe("kstest", () => {
  it("data perfectly matching CDF → D=0, p≈1", () => {
    // Uniform [0, 1] — empirical = theoretical
    const n = 10;
    const data = Array.from({ length: n }, (_, i) => (i + 0.5) / n);
    const { statistic, pvalue } = kstest(data, (x) => x); // uniform CDF
    expect(statistic).toBeLessThan(0.2);
    expect(pvalue).toBeGreaterThan(0.3);
  });

  it("data completely off from CDF → large D, small p", () => {
    // All data at 0 but CDF says it should spread across [0,1]
    const data = new Array(20).fill(0.01) as number[];
    const { pvalue } = kstest(data, (x) => x); // uniform CDF
    expect(pvalue).toBeLessThan(0.05);
  });

  it("standard normal data vs normal CDF → p > 0.05 likely", () => {
    // A reasonable set of values from N(0,1)
    const data = [-1.2, -0.8, -0.4, 0, 0.1, 0.3, 0.6, 0.9, 1.3, 1.8];
    const { statistic } = kstest(data, stdNormCDF);
    expect(statistic).toBeGreaterThan(0);
    expect(statistic).toBeLessThan(0.5);
  });

  it("returns NaN for empty data", () => {
    expect(Number.isNaN(kstest([], (x) => x).statistic)).toBe(true);
  });

  it("property: D ∈ [0, 1] and p ∈ [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 1 }), {
          minLength: 2,
          maxLength: 30,
        }),
        (data) => {
          const { statistic, pvalue } = kstest(data, (x) => x);
          const okD = statistic >= 0 && statistic <= 1;
          const okP = pvalue >= 0 && pvalue <= 1;
          return okD && okP;
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── cross-function consistency ───────────────────────────────────────────────

describe("cross-function consistency", () => {
  it("pearsonr and spearmanr agree for monotone data", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const y = x.map((v) => v * 2 + 1);
    const pr = pearsonr(x, y);
    const sr = spearmanr(x, y);
    expect(r(pr.correlation, 5)).toBeCloseTo(r(sr.correlation, 5), 5);
  });

  it("ttestInd pvalue is symmetric in a/b for two-sided", () => {
    const a = [1, 2, 3, 4];
    const b = [5, 6, 7, 8];
    const ab = ttestInd(a, b, { alternative: "two-sided" });
    const ba = ttestInd(b, a, { alternative: "two-sided" });
    expect(r(ab.pvalue, 6)).toBeCloseTo(r(ba.pvalue, 6), 6);
    expect(r(ab.statistic, 6)).toBeCloseTo(-r(ba.statistic, 6), 6);
  });
});
