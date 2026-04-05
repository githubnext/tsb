/**
 * Tests for GroupBy — DataFrameGroupBy and SeriesGroupBy.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, groupBy, groupBySeries } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTeamDf(): DataFrame {
  return DataFrame.fromColumns({
    team: ["A", "B", "A", "B", "A"],
    score: [10, 20, 30, 40, 50],
    wins: [1, 2, 3, 4, 5],
  });
}

// ─── DataFrameGroupBy ─────────────────────────────────────────────────────────

describe("DataFrameGroupBy", () => {
  describe("construction", () => {
    it("creates from a single key column", () => {
      const g = groupBy(makeTeamDf(), "team");
      expect(g.ngroups).toBe(2);
    });

    it("throws for unknown key column", () => {
      expect(() => groupBy(makeTeamDf(), "unknown")).toThrow();
    });

    it("iterates (key, subDf) pairs", () => {
      const g = groupBy(makeTeamDf(), "team");
      const pairs: [unknown, number][] = [];
      for (const [key, sub] of g) {
        pairs.push([key[0], sub.shape[0]]);
      }
      expect(pairs).toHaveLength(2);
    });
  });

  describe("getGroup", () => {
    it("returns sub-DataFrame for a key", () => {
      const g = groupBy(makeTeamDf(), "team");
      const sub = g.getGroup(["A"]);
      expect(sub.shape[0]).toBe(3);
    });

    it("throws for missing key", () => {
      const g = groupBy(makeTeamDf(), "team");
      expect(() => g.getGroup(["C"])).toThrow();
    });
  });

  describe("sum", () => {
    it("sums numeric columns per group", () => {
      const g = groupBy(makeTeamDf(), "team");
      const result = g.sum();
      const teamA = result.filter(result.col("team").eq("A"));
      expect(teamA.col("score").iat(0)).toBe(90);
      expect(teamA.col("wins").iat(0)).toBe(9);
    });

    it("team B scores sum to 60", () => {
      const g = groupBy(makeTeamDf(), "team");
      const result = g.sum();
      const teamB = result.filter(result.col("team").eq("B"));
      expect(teamB.col("score").iat(0)).toBe(60);
    });
  });

  describe("mean", () => {
    it("computes mean per group", () => {
      const g = groupBy(makeTeamDf(), "team");
      const result = g.mean();
      const teamA = result.filter(result.col("team").eq("A"));
      expect(teamA.col("score").iat(0)).toBe(30);
    });
  });

  describe("count", () => {
    it("counts non-missing values per group", () => {
      const g = groupBy(makeTeamDf(), "team");
      const result = g.count();
      // A has 3 rows, B has 2 rows
      const teamA = result.filter(result.col("team").eq("A"));
      expect(teamA.col("score").iat(0)).toBe(3);
    });
  });

  describe("min / max", () => {
    it("min per group", () => {
      const g = groupBy(makeTeamDf(), "team");
      const result = g.min();
      const teamA = result.filter(result.col("team").eq("A"));
      expect(teamA.col("score").iat(0)).toBe(10);
    });

    it("max per group", () => {
      const g = groupBy(makeTeamDf(), "team");
      const result = g.max();
      const teamA = result.filter(result.col("team").eq("A"));
      expect(teamA.col("score").iat(0)).toBe(50);
    });
  });

  describe("std / var", () => {
    it("std returns NaN for single-element group (ddof=1)", () => {
      const df = DataFrame.fromColumns({ k: ["A", "B", "B"], v: [1, 2, 4] });
      const g = groupBy(df, "k");
      const res = g.std();
      const stdA = res.filter(res.col("k").eq("A")).col("v").iat(0);
      expect(Number.isNaN(stdA as number)).toBe(true);
    });

    it("std for B is correct", () => {
      const df = DataFrame.fromColumns({ k: ["A", "B", "B"], v: [1, 2, 4] });
      const g = groupBy(df, "k");
      const res = g.std();
      const stdB = res.filter(res.col("k").eq("B")).col("v").iat(0) as number;
      expect(stdB).toBeCloseTo(Math.sqrt(2), 10);
    });
  });

  describe("median", () => {
    it("median per group", () => {
      const df = DataFrame.fromColumns({ k: ["A", "A", "A", "B", "B"], v: [1, 3, 5, 10, 20] });
      const g = groupBy(df, "k");
      const res = g.median();
      expect(res.filter(res.col("k").eq("A")).col("v").iat(0)).toBe(3);
      expect(res.filter(res.col("k").eq("B")).col("v").iat(0)).toBe(15);
    });
  });

  describe("first / last", () => {
    it("first returns first non-null per group", () => {
      const df = DataFrame.fromColumns({ k: ["A", "A", "B"], v: [null, 2, 3] });
      const g = groupBy(df, "k");
      const res = g.first();
      expect(res.filter(res.col("k").eq("A")).col("v").iat(0)).toBe(2);
      expect(res.filter(res.col("k").eq("B")).col("v").iat(0)).toBe(3);
    });

    it("last returns last non-null per group", () => {
      const df = DataFrame.fromColumns({ k: ["A", "A", "B"], v: [1, null, 3] });
      const g = groupBy(df, "k");
      const res = g.last();
      expect(res.filter(res.col("k").eq("A")).col("v").iat(0)).toBe(1);
    });
  });

  describe("size", () => {
    it("returns group sizes as a Series", () => {
      const g = groupBy(makeTeamDf(), "team");
      const s = g.size();
      expect(s.size).toBe(2);
    });
  });

  describe("apply", () => {
    it("custom aggregation returns correct result", () => {
      const df = DataFrame.fromColumns({ k: ["A", "A", "B"], v: [2, 4, 6] });
      const g = groupBy(df, "k");
      const result = g.apply((sub) => ({
        range: (sub.col("v").max() as number) - (sub.col("v").min() as number),
      }));
      expect(result.col("range").sum()).toBe(2); // A: 4-2=2, B: 6-6=0
    });
  });

  describe("transform", () => {
    it("demean each group", () => {
      const df = DataFrame.fromColumns({ k: ["A", "A", "B", "B"], v: [10, 20, 30, 50] });
      const g = groupBy(df, "k");
      const result = g.transform((col) => {
        const m = col.mean();
        return col.sub(m) as Series<import("../../src/types.ts").Scalar>;
      });
      const vCol = result.col("v");
      // A mean = 15: 10-15=-5, 20-15=5
      expect(vCol.iat(0)).toBe(-5);
      expect(vCol.iat(1)).toBe(5);
      // B mean = 40: 30-40=-10, 50-40=10
      expect(vCol.iat(2)).toBe(-10);
      expect(vCol.iat(3)).toBe(10);
    });
  });

  describe("multi-key groupBy", () => {
    it("groups by two columns", () => {
      const df = DataFrame.fromColumns({
        dept: ["Eng", "Eng", "HR", "HR", "Eng"],
        level: ["Jr", "Sr", "Jr", "Sr", "Jr"],
        salary: [80, 120, 60, 90, 85],
      });
      const g = groupBy(df, ["dept", "level"]);
      expect(g.ngroups).toBe(3); // Eng/Jr, Eng/Sr, HR/Jr, HR/Sr → but only 3 distinct combos present
      const res = g.sum();
      expect(res.shape[0]).toBe(3);
    });
  });

  describe("property-based", () => {
    it("sum is consistent with manual filter+sum", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom("X", "Y", "Z"), { minLength: 1, maxLength: 20 }),
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
          (keys, vals) => {
            const n = Math.min(keys.length, vals.length);
            const df = DataFrame.fromColumns({
              k: keys.slice(0, n),
              v: vals.slice(0, n),
            });
            const g = groupBy(df, "k");
            const sumDf = g.sum();
            const uniqueKeys = [...new Set(keys.slice(0, n))];
            for (const key of uniqueKeys) {
              const manual = vals
                .slice(0, n)
                .filter((_, i) => keys[i] === key)
                .reduce((a, b) => a + b, 0);
              const fromGroup = sumDf.filter(sumDf.col("k").eq(key)).col("v").iat(0) as number;
              if (manual !== fromGroup) {
                return false;
              }
            }
            return true;
          },
        ),
      );
    });
  });
});

// ─── SeriesGroupBy ────────────────────────────────────────────────────────────

describe("SeriesGroupBy", () => {
  it("sums by key Series", () => {
    const s = new Series({ data: [10, 20, 30, 40], name: "vals" });
    const k = new Series({ data: ["a", "b", "a", "b"], name: "key" });
    const res = groupBySeries(s, k).sum();
    expect(res.at("a")).toBe(40);
    expect(res.at("b")).toBe(60);
  });

  it("mean by key", () => {
    const s = new Series({ data: [10, 20, 30, 40], name: "vals" });
    const k = new Series({ data: ["a", "b", "a", "b"], name: "key" });
    const res = groupBySeries(s, k).mean();
    expect(res.at("a")).toBe(20);
    expect(res.at("b")).toBe(30);
  });

  it("size returns group counts", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5], name: "v" });
    const k = new Series({ data: ["a", "a", "b", "b", "b"], name: "k" });
    const res = groupBySeries(s, k).size();
    expect(res.at("a")).toBe(2);
    expect(res.at("b")).toBe(3);
  });

  it("throws when sizes mismatch", () => {
    const s = new Series({ data: [1, 2, 3], name: "v" });
    const k = new Series({ data: ["a", "b"], name: "k" });
    expect(() => groupBySeries(s, k)).toThrow(RangeError);
  });

  it("iterates (key, subSeries) pairs", () => {
    const s = new Series({ data: [1, 2, 3], name: "v" });
    const k = new Series({ data: ["a", "b", "a"], name: "k" });
    const g = groupBySeries(s, k);
    const pairs: [unknown, number][] = [];
    for (const [key, sub] of g) {
      pairs.push([key, sub.size]);
    }
    expect(pairs).toHaveLength(2);
  });
});
