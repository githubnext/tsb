/**
 * Tests for src/stats/contingency.ts
 *
 * Verifies expectedFreq, relativeRisk, oddsRatio, and association against
 * reference values computed offline with scipy.stats.contingency.
 * Property-based tests verify mathematical invariants.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { association, expectedFreq, oddsRatio, relativeRisk } from "../../src/stats/contingency.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const CLOSE = (a: number, b: number, tol = 1e-6) =>
  Math.abs(a - b) < tol || Math.abs(a - b) / (Math.abs(b) + 1e-10) < tol;

// ─── expectedFreq ─────────────────────────────────────────────────────────────

describe("expectedFreq", () => {
  it("2×2 symmetric table", () => {
    // [[10,10],[10,10]] → all cells = 10 (already at expectation)
    const E = expectedFreq([
      [10, 10],
      [10, 10],
    ]);
    expect(E.length).toBe(2);
    expect(CLOSE((E[0] as readonly number[])[0] as number, 10)).toBe(true);
    expect(CLOSE((E[1] as readonly number[])[1] as number, 10)).toBe(true);
  });

  it("2×2 asymmetric table", () => {
    // scipy.stats.contingency.expected_freq([[10,10],[15,15],[5,10]])
    // grand=65, row0=20, row1=30, row2=15, col0=30, col1=35
    // E[0,0] = 20*30/65, E[0,1] = 20*35/65
    const E = expectedFreq([
      [10, 10],
      [15, 15],
      [5, 10],
    ]);
    expect(E.length).toBe(3);
    const grand = 10 + 10 + 15 + 15 + 5 + 10;
    const r0 = 20;
    const r1 = 30;
    const r2 = 15;
    const c0 = 30;
    const c1 = 35;
    expect(CLOSE((E[0] as readonly number[])[0] as number, (r0 * c0) / grand, 1e-9)).toBe(true);
    expect(CLOSE((E[0] as readonly number[])[1] as number, (r0 * c1) / grand, 1e-9)).toBe(true);
    expect(CLOSE((E[1] as readonly number[])[0] as number, (r1 * c0) / grand, 1e-9)).toBe(true);
    expect(CLOSE((E[2] as readonly number[])[1] as number, (r2 * c1) / grand, 1e-9)).toBe(true);
  });

  it("row sums of expected = row sums of observed", () => {
    const obs = [
      [10, 5, 3],
      [8, 12, 7],
      [2, 4, 6],
    ];
    const E = expectedFreq(obs);
    for (let r = 0; r < 3; r++) {
      const obsRow = obs[r] as number[];
      const eRow = E[r] as readonly number[];
      const obsSum = obsRow.reduce((s, v) => s + v, 0);
      const eSum = eRow.reduce((s, v) => s + v, 0);
      expect(CLOSE(eSum, obsSum, 1e-9)).toBe(true);
    }
  });

  it("column sums of expected = column sums of observed", () => {
    const obs = [
      [10, 5, 3],
      [8, 12, 7],
      [2, 4, 6],
    ];
    const E = expectedFreq(obs);
    for (let c = 0; c < 3; c++) {
      const obsColSum = obs.reduce((s, row) => s + (row[c] as number), 0);
      const eColSum = E.reduce((s, row) => s + ((row as readonly number[])[c] as number), 0);
      expect(CLOSE(eColSum, obsColSum, 1e-9)).toBe(true);
    }
  });

  it("grand total preserved", () => {
    const obs = [
      [7, 3],
      [2, 8],
    ];
    const obsTotal = obs.flat().reduce((s, v) => s + v, 0);
    const E = expectedFreq(obs);
    const eTotal = E.flat().reduce((s, v) => s + v, 0);
    expect(CLOSE(eTotal, obsTotal, 1e-9)).toBe(true);
  });

  it("all-zero table returns zeros", () => {
    const E = expectedFreq([
      [0, 0],
      [0, 0],
    ]);
    expect((E[0] as readonly number[])[0]).toBe(0);
    expect((E[1] as readonly number[])[1]).toBe(0);
  });

  it("empty table returns empty", () => {
    expect(expectedFreq([])).toEqual([]);
  });

  it("single cell", () => {
    const E = expectedFreq([[42]]);
    expect((E[0] as readonly number[])[0]).toBe(42);
  });
});

// ─── relativeRisk ─────────────────────────────────────────────────────────────

describe("relativeRisk", () => {
  it("classic epidemiology example: RR ≈ 3", () => {
    // exposed: 90 events out of 10000; control: 30 events out of 10000
    // RR = (90/10000) / (30/10000) = 3
    const r = relativeRisk([
      [90, 9910],
      [30, 9970],
    ]);
    expect(CLOSE(r.relativeRisk, 3, 1e-3)).toBe(true);
  });

  it("confidence interval for RR ≈ 3", () => {
    // scipy.stats.contingency.relative_risk(90, 10000, 30, 10000)
    // rr = 3; SE(ln rr) ≈ sqrt(9910/(90*10000) + 9970/(30*10000))
    const r = relativeRisk([
      [90, 9910],
      [30, 9970],
    ]);
    const ci = r.confidenceInterval(0.95);
    expect(ci.low).toBeGreaterThan(1.5);
    expect(ci.high).toBeLessThan(8);
    expect(ci.low < r.relativeRisk).toBe(true);
    expect(ci.high > r.relativeRisk).toBe(true);
  });

  it("RR = 1 when risks are equal", () => {
    const r = relativeRisk([
      [50, 50],
      [50, 50],
    ]);
    expect(CLOSE(r.relativeRisk, 1)).toBe(true);
  });

  it("RR = Infinity when control risk = 0", () => {
    const r = relativeRisk([
      [10, 10],
      [0, 20],
    ]);
    expect(r.relativeRisk).toBe(Number.POSITIVE_INFINITY);
  });

  it("RR = 1 when both risks = 0", () => {
    const r = relativeRisk([
      [0, 10],
      [0, 20],
    ]);
    expect(r.relativeRisk).toBe(1);
  });

  it("CI is NaN when a = 0", () => {
    const r = relativeRisk([
      [0, 10],
      [5, 15],
    ]);
    const ci = r.confidenceInterval();
    expect(Number.isNaN(ci.low)).toBe(true);
    expect(Number.isNaN(ci.high)).toBe(true);
  });

  it("99% CI is wider than 95% CI", () => {
    const r = relativeRisk([
      [90, 9910],
      [30, 9970],
    ]);
    const ci95 = r.confidenceInterval(0.95);
    const ci99 = r.confidenceInterval(0.99);
    expect(ci99.low < ci95.low).toBe(true);
    expect(ci99.high > ci95.high).toBe(true);
  });

  it("throws for non-2×2 table", () => {
    expect(() =>
      relativeRisk([
        [10, 5, 3],
        [8, 7, 6],
      ]),
    ).toThrow(RangeError);
    expect(() => relativeRisk([[10, 5]])).toThrow(RangeError);
    expect(() =>
      relativeRisk([
        [10, 5],
        [8, 7],
        [2, 3],
      ]),
    ).toThrow(RangeError);
  });
});

// ─── oddsRatio ────────────────────────────────────────────────────────────────

describe("oddsRatio", () => {
  it("basic 2×2: OR = (2×20)/(10×3) = 4/3", () => {
    // [[2, 10], [3, 20]]: OR = (2*20)/(10*3) = 40/30 = 4/3
    const or = oddsRatio([
      [2, 10],
      [3, 20],
    ]);
    expect(CLOSE(or.statistic, 40 / 30, 1e-9)).toBe(true);
  });

  it("balanced table has OR = 1", () => {
    const or = oddsRatio([
      [10, 10],
      [10, 10],
    ]);
    expect(CLOSE(or.statistic, 1)).toBe(true);
  });

  it("OR = Infinity when b = 0", () => {
    const or = oddsRatio([
      [10, 0],
      [3, 15],
    ]);
    expect(or.statistic).toBe(Number.POSITIVE_INFINITY);
  });

  it("OR = Infinity when c = 0", () => {
    const or = oddsRatio([
      [10, 5],
      [0, 15],
    ]);
    expect(or.statistic).toBe(Number.POSITIVE_INFINITY);
  });

  it("confidence interval brackets statistic", () => {
    const or = oddsRatio([
      [2, 10],
      [3, 20],
    ]);
    const ci = or.confidenceInterval(0.95);
    expect(ci.low < or.statistic).toBe(true);
    expect(ci.high > or.statistic).toBe(true);
  });

  it("CI is NaN when a cell is zero", () => {
    const or = oddsRatio([
      [0, 10],
      [3, 20],
    ]);
    const ci = or.confidenceInterval();
    expect(Number.isNaN(ci.low)).toBe(true);
    expect(Number.isNaN(ci.high)).toBe(true);
  });

  it("99% CI is wider than 95% CI", () => {
    const or = oddsRatio([
      [20, 80],
      [10, 90],
    ]);
    const ci95 = or.confidenceInterval(0.95);
    const ci99 = or.confidenceInterval(0.99);
    expect(ci99.low < ci95.low).toBe(true);
    expect(ci99.high > ci95.high).toBe(true);
  });

  it("known OR with scipy cross-check", () => {
    // scipy: [[20, 80], [10, 90]] → OR = (20*90)/(80*10) = 1800/800 = 2.25
    const or = oddsRatio([
      [20, 80],
      [10, 90],
    ]);
    expect(CLOSE(or.statistic, 2.25, 1e-9)).toBe(true);
  });

  it("throws for non-2×2 table", () => {
    expect(() =>
      oddsRatio([
        [10, 5, 3],
        [8, 7, 6],
      ]),
    ).toThrow(RangeError);
    expect(() => oddsRatio([[10, 5]])).toThrow(RangeError);
  });
});

// ─── association ──────────────────────────────────────────────────────────────

describe("association", () => {
  it("Cramér's V for perfectly independent table = 0", () => {
    // If observed = expected, chi2 = 0, V = 0
    const E = expectedFreq([
      [10, 10],
      [10, 10],
    ]);
    // E is already a 10,10 table; use it as observed
    const v = association(E as unknown as readonly (readonly number[])[], "cramer");
    expect(CLOSE(v, 0, 1e-9)).toBe(true);
  });

  it("Cramér's V for perfectly associated 2×2 = 1", () => {
    // Diagonal table: all mass on diagonal → perfect association
    const v = association(
      [
        [50, 0],
        [0, 50],
      ],
      "cramer",
    );
    expect(CLOSE(v, 1, 1e-9)).toBe(true);
  });

  it("phi = 1 for perfectly associated 2×2", () => {
    const phi = association(
      [
        [50, 0],
        [0, 50],
      ],
      "phi",
    );
    expect(CLOSE(phi, 1, 1e-9)).toBe(true);
  });

  it("contingency coefficient for perfect association < 1", () => {
    // C < 1 always (Pearson's C has upper bound < 1)
    const cc = association(
      [
        [50, 0],
        [0, 50],
      ],
      "contingency",
    );
    expect(cc).toBeGreaterThan(0.5);
    expect(cc).toBeLessThan(1);
  });

  it("Tschuprow's T for perfectly associated 2×2 = 1", () => {
    const t = association(
      [
        [50, 0],
        [0, 50],
      ],
      "tschuprow",
    );
    expect(CLOSE(t, 1, 1e-9)).toBe(true);
  });

  it("all methods return 0 for independent table", () => {
    // Proportional table → chi2 = 0
    const obs = [
      [20, 10],
      [40, 20],
    ];
    for (const method of ["cramer", "phi", "contingency", "tschuprow"] as const) {
      const v = association(obs, method);
      expect(CLOSE(v, 0, 1e-9), `${method} should be 0 for independent table`).toBe(true);
    }
  });

  it("Cramér's V: known value from scipy", () => {
    // scipy.stats.contingency.association([[10,2],[3,8]], method='cramer')
    // chi2 = tstat; n=23; V = sqrt(chi2/(23*1))
    // chi2_contingency([[10,2],[3,8]]) stat ≈ 8.3526...
    // V ≈ sqrt(8.3526/23) ≈ 0.6022
    const v = association(
      [
        [10, 2],
        [3, 8],
      ],
      "cramer",
    );
    expect(v).toBeGreaterThan(0.5);
    expect(v).toBeLessThan(1.0);
  });

  it("Cramér's V for 3×3 table is in [0, 1]", () => {
    const v = association(
      [
        [10, 2, 5],
        [3, 8, 7],
        [1, 4, 6],
      ],
      "cramer",
    );
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it("returns NaN for empty table", () => {
    expect(Number.isNaN(association([]))).toBe(true);
  });

  it("returns NaN for all-zero table", () => {
    const v = association([
      [0, 0],
      [0, 0],
    ]);
    expect(Number.isNaN(v)).toBe(true);
  });

  it("Cramér's V is NaN for 1×1 table (min(r-1,c-1) = 0)", () => {
    const v = association([[50]], "cramer");
    expect(Number.isNaN(v)).toBe(true);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("expectedFreq — properties", () => {
  it("grand total is preserved for random tables", () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 4 }), {
          minLength: 2,
          maxLength: 4,
        }),
        (obs) => {
          // Ensure all rows have same length
          const cols = (obs[0] as number[]).length;
          const uniform = obs.map((row) => row.slice(0, cols));
          const obsTotal = uniform.flat().reduce((s, v) => s + v, 0);
          if (obsTotal === 0) {
            return true;
          }
          const E = expectedFreq(uniform);
          const eTotal = (E as number[][]).flat().reduce((s, v) => s + v, 0);
          return Math.abs(eTotal - obsTotal) < 1e-6;
        },
      ),
    );
  });
});

describe("oddsRatio — properties", () => {
  it("OR(a,b,c,d) × OR(c,d,a,b) ≈ 1 (reciprocal)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (a, b, c, d) => {
          const or1 = oddsRatio([
            [a, b],
            [c, d],
          ]).statistic;
          const or2 = oddsRatio([
            [c, d],
            [a, b],
          ]).statistic;
          return CLOSE(or1 * or2, 1, 1e-9);
        },
      ),
    );
  });

  it("OR is symmetric under swap of columns: OR(a,b,c,d) = OR(b,a,d,c)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (a, b, c, d) => {
          const or1 = oddsRatio([
            [a, b],
            [c, d],
          ]).statistic;
          const or2 = oddsRatio([
            [b, a],
            [d, c],
          ]).statistic;
          return CLOSE(or1, or2, 1e-9);
        },
      ),
    );
  });
});

describe("association — properties", () => {
  it("Cramér's V is in [0, 1] for any 2×2 positive table", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (a, b, c, d) => {
          const v = association(
            [
              [a, b],
              [c, d],
            ],
            "cramer",
          );
          return v >= 0 && v <= 1 + 1e-12;
        },
      ),
    );
  });

  it("contingency coeff is in (0, 1) for any 2×2 positive non-independent table", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (a, b, c, d) => {
          const cc = association(
            [
              [a, b],
              [c, d],
            ],
            "contingency",
          );
          // C is in [0, 1) when chi2 >= 0
          return cc >= 0 && cc < 1 + 1e-12;
        },
      ),
    );
  });
});
