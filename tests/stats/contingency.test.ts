import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import { chi2Contingency, contingencyTable, fisherExact } from "../../src/stats/contingency.ts";

describe("contingencyTable", () => {
  it("builds a 2x2 table from two Series", () => {
    const x = new Series({ data: ["a", "b", "a", "b"] });
    const y = new Series({ data: ["x", "x", "y", "y"] });
    const tbl = contingencyTable(x, y);
    expect(tbl.index.size).toBe(2);
    expect(tbl.columns.values.length).toBe(2);
    // a-x: 1, a-y: 1, b-x: 1, b-y: 1
    expect(tbl.col("x").values).toEqual([1, 1]);
    expect(tbl.col("y").values).toEqual([1, 1]);
  });

  it("counts correctly with unequal distributions", () => {
    const x = new Series({ data: ["cat", "cat", "dog", "dog", "dog"] });
    const y = new Series({ data: ["yes", "no", "yes", "yes", "no"] });
    const tbl = contingencyTable(x, y);
    expect(tbl.col("yes").values[0]).toBe(1); // cat-yes
    expect(tbl.col("no").values[0]).toBe(1); // cat-no
    expect(tbl.col("yes").values[1]).toBe(2); // dog-yes
    expect(tbl.col("no").values[1]).toBe(1); // dog-no
  });

  it("throws when lengths differ", () => {
    const x = new Series({ data: [1, 2, 3] });
    const y = new Series({ data: [1, 2] });
    expect(() => contingencyTable(x, y)).toThrow();
  });

  it("handles empty Series", () => {
    const x = new Series({ data: [] });
    const y = new Series({ data: [] });
    const tbl = contingencyTable(x, y);
    expect(tbl.index.size).toBe(0);
  });

  // Property: total count equals input length
  it("property: total count == input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c"), { minLength: 1, maxLength: 20 }),
        (xs) => {
          const ys = xs.map((v) => (v === "a" ? "x" : "y"));
          const x = new Series({ data: xs });
          const y = new Series({ data: ys });
          const tbl = contingencyTable(x, y);
          const nRows = tbl.index.size;
          const colNames = [...tbl.columns.values];
          let total = 0;
          for (let r = 0; r < nRows; r++) {
            for (const c of colNames) {
              const v = tbl.col(c).values[r];
              total += typeof v === "number" ? v : 0;
            }
          }
          expect(total).toBe(xs.length);
        },
      ),
    );
  });
});

describe("chi2Contingency", () => {
  it("computes statistic and p-value for a simple table", () => {
    // Perfect independence: [[10, 10], [10, 10]]
    const tbl = DataFrame.fromColumns({ yes: [10, 10], no: [10, 10] }, { index: ["a", "b"] });
    const result = chi2Contingency(tbl, { correction: false });
    expect(result.statistic).toBeCloseTo(0, 6);
    expect(result.pvalue).toBeCloseTo(1, 4);
    expect(result.dof).toBe(1);
  });

  it("detects strong dependency (high statistic, low p-value)", () => {
    const tbl = DataFrame.fromColumns({ yes: [40, 2], no: [2, 40] }, { index: ["a", "b"] });
    const result = chi2Contingency(tbl, { correction: false });
    expect(result.statistic).toBeGreaterThan(20);
    expect(result.pvalue).toBeLessThan(0.001);
  });

  it("returns expected DataFrame of same shape", () => {
    const tbl = DataFrame.fromColumns({ x: [10, 5], y: [5, 10] }, { index: ["a", "b"] });
    const result = chi2Contingency(tbl, { correction: false });
    expect(result.expected.index.size).toBe(2);
    expect(result.expected.columns.values.length).toBe(2);
    // Row totals of expected == row totals of observed
    const expRowSum0 =
      (result.expected.col("x").values[0] as number) +
      (result.expected.col("y").values[0] as number);
    expect(expRowSum0).toBeCloseTo(15, 4);
  });

  it("applies Yates correction for 2x2 by default", () => {
    const tbl = DataFrame.fromColumns({ a: [3, 1], b: [1, 3] }, { index: ["r1", "r2"] });
    const withCorr = chi2Contingency(tbl);
    const noCorr = chi2Contingency(tbl, { correction: false });
    expect(withCorr.statistic).toBeLessThan(noCorr.statistic);
  });

  it("handles dof=0 for 1x1 table", () => {
    const tbl = DataFrame.fromColumns({ x: [5] }, { index: ["r"] });
    const result = chi2Contingency(tbl, { correction: false });
    expect(result.dof).toBe(0);
    expect(result.pvalue).toBe(1);
  });

  it("throws for empty table", () => {
    const tbl = DataFrame.fromColumns({});
    expect(() => chi2Contingency(tbl)).toThrow();
  });
});

describe("fisherExact", () => {
  it("computes p-value for a perfectly associated table", () => {
    // [[10, 0], [0, 10]] — perfect association
    const tbl = DataFrame.fromColumns({ yes: [10, 0], no: [0, 10] }, { index: ["a", "b"] });
    const result = fisherExact(tbl);
    expect(result.pvalue).toBeLessThan(0.01);
    expect(result.oddsRatio).toBe(Number.POSITIVE_INFINITY);
  });

  it("computes p-value for a balanced table", () => {
    // [[5, 5], [5, 5]] — no association
    const tbl = DataFrame.fromColumns({ yes: [5, 5], no: [5, 5] }, { index: ["a", "b"] });
    const result = fisherExact(tbl);
    expect(result.pvalue).toBeGreaterThan(0.5);
    expect(result.oddsRatio).toBeCloseTo(1, 4);
  });

  it("computes odds ratio correctly", () => {
    // a=6, b=2, c=2, d=6 => OR = 36/4 = 9
    const tbl = DataFrame.fromColumns({ yes: [6, 2], no: [2, 6] }, { index: ["a", "b"] });
    const result = fisherExact(tbl);
    expect(result.oddsRatio).toBeCloseTo(9, 3);
  });

  it("throws for non-2x2 table", () => {
    const tbl = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] }, { index: ["x", "y", "z"] });
    expect(() => fisherExact(tbl)).toThrow();
  });

  // Property: p-value is between 0 and 1
  it("property: p-value in [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (a, b, c, d) => {
          if (a + b + c + d === 0) return;
          const tbl = DataFrame.fromColumns({ yes: [a, c], no: [b, d] }, { index: ["r1", "r2"] });
          const result = fisherExact(tbl);
          expect(result.pvalue).toBeGreaterThanOrEqual(0);
          expect(result.pvalue).toBeLessThanOrEqual(1.001);
        },
      ),
    );
  });
});
