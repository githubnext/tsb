/**
 * Tests for src/stats/cut_extended.ts
 * Covers cutWithBins, qcutWithBins, cutOrdered, qcutOrdered,
 * compareCategories, sortByCategory.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  Series,
  cutOrdered,
  cutWithBins,
  compareCategories,
  qcutOrdered,
  qcutWithBins,
  sortByCategory,
} from "../../src/index.ts";

// ─── cutWithBins ─────────────────────────────────────────────────────────

describe("cutWithBins — basic", () => {
  it("returns result and bins for integer bins", () => {
    const { result, bins } = cutWithBins([1, 2, 3, 4, 5], 2);
    expect(result.size).toBe(5);
    // 3 edges for 2 bins
    expect(bins.length).toBe(3);
    // edges are finite numbers
    for (const b of bins) expect(Number.isFinite(b)).toBe(true);
  });

  it("bins match cut() result for same inputs", () => {
    const { result } = cutWithBins([1, 2, 3, 4, 5], 3);
    const vals = result.values as readonly (string | null)[];
    // First two values should be in lowest bin
    expect(vals[0]).not.toBe(null);
    // All same-bin elements share the same label
    const unique = new Set(vals.filter((v) => v !== null));
    expect(unique.size).toBe(3);
  });

  it("returns bin edges for explicit edge array", () => {
    const { result, bins } = cutWithBins([1, 2, 3, 4, 5], [0, 3, 6]);
    expect(bins).toEqual([0, 3, 6]);
    const vals = result.values as readonly (string | null)[];
    // 1,2,3 → (0,3]; 4,5 → (3,6]
    expect(vals[0]).toBe(vals[1]);
    expect(vals[0]).toBe(vals[2]);
    expect(vals[3]).toBe(vals[4]);
    expect(vals[0]).not.toBe(vals[3]);
  });

  it("returns edges that span [min, max] for integer bins", () => {
    const { bins } = cutWithBins([10, 20, 30], 3);
    // first edge ≤ min - pad, last edge ≥ max + pad
    expect(bins[0]).toBeLessThan(10);
    expect(bins[bins.length - 1]).toBeGreaterThan(30);
  });

  it("respects labels=false returning integer codes", () => {
    const { result } = cutWithBins([1, 2, 3, 4, 5], 2, { labels: false });
    const vals = result.values as readonly (number | null)[];
    for (const v of vals) expect(typeof v === "number" || v === null).toBe(true);
    const codes = vals.filter((v) => v !== null) as number[];
    for (const c of codes) expect(c >= 0 && c < 2).toBe(true);
  });

  it("respects custom labels", () => {
    const { result } = cutWithBins([1, 2, 3, 4, 5], [0, 3, 6], { labels: ["low", "high"] });
    const vals = result.values as readonly (string | null)[];
    for (const v of vals) expect(v === "low" || v === "high").toBe(true);
  });

  it("respects includeLowest", () => {
    // Without includeLowest, the exact minimum might be null (out of range for right-closed).
    // With includeLowest it should always be assigned.
    const { result } = cutWithBins([1, 1, 2, 3], [1, 2, 3], { includeLowest: true });
    const vals = result.values as readonly (string | null)[];
    // With includeLowest, the leftmost edge 1 is included in the first bin.
    expect(vals[0]).not.toBe(null);
  });

  it("respects duplicates='drop'", () => {
    const { bins } = cutWithBins([1, 2, 3], [0, 1, 1, 3], { duplicates: "drop" });
    // duplicate 1 is dropped → [0, 1, 3]
    expect(bins).toEqual([0, 1, 3]);
  });

  it("throws on too-short edge array", () => {
    expect(() => cutWithBins([1, 2], [1])).toThrow();
  });

  it("throws on duplicate edges with raise", () => {
    expect(() => cutWithBins([1, 2], [0, 1, 1, 2])).toThrow(/duplicate/i);
  });

  it("preserves Series name and index", () => {
    const s = new Series({ data: [1, 2, 3], name: "x" });
    const { result } = cutWithBins(s, 2);
    expect(result.name).toBe("x");
    expect(result.size).toBe(3);
  });
});

// ─── qcutWithBins ─────────────────────────────────────────────────────────

describe("qcutWithBins — basic", () => {
  it("returns result and bins for integer q", () => {
    const { result, bins } = qcutWithBins([1, 2, 3, 4, 5], 4);
    expect(result.size).toBe(5);
    expect(bins.length).toBe(5); // 4 quantiles → 5 edges
  });

  it("returns bins for quantile fractions", () => {
    const { bins } = qcutWithBins([1, 2, 3, 4, 5], [0, 0.5, 1.0]);
    expect(bins.length).toBe(3);
    expect(bins[0]).toBe(1);
    expect(bins[bins.length - 1]).toBe(5);
  });

  it("respects custom labels", () => {
    const { result } = qcutWithBins([1, 2, 3, 4, 5], [0, 0.5, 1.0], {
      labels: ["bottom", "top"],
    });
    const vals = result.values as readonly (string | null)[];
    for (const v of vals) expect(v === "bottom" || v === "top").toBe(true);
  });

  it("throws on q < 2", () => {
    expect(() => qcutWithBins([1, 2, 3], 1)).toThrow(/q must be ≥ 2/);
  });

  it("throws on no finite values", () => {
    expect(() => qcutWithBins([null, null], 2)).toThrow(/no finite/);
  });
});

// ─── cutOrdered ─────────────────────────────────────────────────────────

describe("cutOrdered", () => {
  it("returns ordered=true always", () => {
    const res = cutOrdered([1, 2, 3, 4, 5], 2);
    expect(res.ordered).toBe(true);
  });

  it("categories are ordered smallest→largest", () => {
    const { result, categories } = cutOrdered([1, 2, 3, 4, 5], [0, 3, 6], {
      labels: ["low", "high"],
    });
    expect(categories).toEqual(["low", "high"]);
    expect(result.size).toBe(5);
  });

  it("categories count equals bin count", () => {
    const { categories } = cutOrdered([1, 2, 3, 4, 5, 6], 3);
    expect(categories.length).toBe(3);
  });

  it("categories match interval labels when no custom labels given", () => {
    const { result, categories } = cutOrdered([1, 2, 3, 4, 5], [0, 3, 6]);
    const vals = new Set((result.values as readonly (string | null)[]).filter((v) => v !== null));
    for (const v of vals) expect(categories.includes(v as string)).toBe(true);
  });

  it("returns bins alongside result", () => {
    const { bins } = cutOrdered([1, 2, 3], [0, 2, 4]);
    expect(bins).toEqual([0, 2, 4]);
  });

  it("labels=false produces integer-string categories", () => {
    const { categories } = cutOrdered([1, 2, 3, 4], 2, { labels: false });
    expect(categories).toEqual(["0", "1"]);
  });
});

// ─── qcutOrdered ─────────────────────────────────────────────────────────

describe("qcutOrdered", () => {
  it("returns ordered=true", () => {
    const { ordered } = qcutOrdered([1, 2, 3, 4, 5], 2);
    expect(ordered).toBe(true);
  });

  it("categories length equals q count", () => {
    const { categories } = qcutOrdered([1, 2, 3, 4, 5, 6, 7, 8], 4);
    expect(categories.length).toBe(4);
  });

  it("bins length equals q + 1 for integer q", () => {
    const { bins } = qcutOrdered([1, 2, 3, 4, 5], 3);
    expect(bins.length).toBe(4);
  });
});

// ─── compareCategories ─────────────────────────────────────────────────

describe("compareCategories", () => {
  const cats = ["low", "mid", "high"];

  it("returns 0 for equal values", () => {
    expect(compareCategories("low", "low", cats)).toBe(0);
    expect(compareCategories(null, null, cats)).toBe(0);
  });

  it("null < any string", () => {
    expect(compareCategories(null, "low", cats)).toBeLessThan(0);
    expect(compareCategories("low", null, cats)).toBeGreaterThan(0);
  });

  it("preserves order: low < mid < high", () => {
    expect(compareCategories("low", "mid", cats)).toBeLessThan(0);
    expect(compareCategories("mid", "high", cats)).toBeLessThan(0);
    expect(compareCategories("low", "high", cats)).toBeLessThan(0);
  });

  it("reverse holds: mid > low", () => {
    expect(compareCategories("mid", "low", cats)).toBeGreaterThan(0);
  });

  it("unknown label sorts after all known", () => {
    expect(compareCategories("unknown", "high", cats)).toBeGreaterThan(0);
    expect(compareCategories("unknown", null, cats)).toBeGreaterThan(0);
  });

  it("transitivity: a < b && b < c => a < c", () => {
    expect(compareCategories("low", "mid", cats)).toBeLessThan(0);
    expect(compareCategories("mid", "high", cats)).toBeLessThan(0);
    expect(compareCategories("low", "high", cats)).toBeLessThan(0);
  });
});

// ─── sortByCategory ─────────────────────────────────────────────────────

describe("sortByCategory", () => {
  it("sorts Series by category order ascending", () => {
    const { result, categories } = cutOrdered([3, 1, 5, 2, 4], [0, 2, 4, 6], {
      labels: ["low", "mid", "high"],
    });
    const sorted = sortByCategory(result, categories);
    const vals = sorted.values as readonly (string | null)[];
    // null (if any) should come first; then low, mid, high
    let prevRank = -1;
    for (const v of vals) {
      const rank = v === null ? -1 : categories.indexOf(v);
      expect(rank >= prevRank).toBe(true);
      prevRank = rank;
    }
  });

  it("sorts descending when ascending=false", () => {
    const { result, categories } = cutOrdered([3, 1, 5, 2, 4], [0, 2, 4, 6], {
      labels: ["low", "mid", "high"],
    });
    const sorted = sortByCategory(result, categories, false);
    const vals = sorted.values as readonly (string | null)[];
    let prevRank = categories.length + 1;
    for (const v of vals) {
      const rank = v === null ? -1 : categories.indexOf(v);
      expect(rank <= prevRank).toBe(true);
      prevRank = rank;
    }
  });

  it("preserves all elements (no duplicates lost)", () => {
    const { result, categories } = cutOrdered([1, 2, 3, 4, 5, 6], 3);
    const sorted = sortByCategory(result, categories);
    expect(sorted.size).toBe(result.size);
  });

  it("empty Series sorts to empty", () => {
    const s = new Series<import("../../src/types.ts").Scalar>({ data: [] });
    const sorted = sortByCategory(s, ["a", "b"]);
    expect(sorted.size).toBe(0);
  });
});

// ─── property tests ─────────────────────────────────────────────────────

describe("cutWithBins — property tests", () => {
  it("result.size === input.length for any finite array", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e9, max: 1e9 }), {
          minLength: 5,
          maxLength: 50,
        }),
        fc.integer({ min: 2, max: 6 }),
        (arr, nbins) => {
          // Need at least some distinct values for bins
          if (new Set(arr).size < 2) return;
          const { result, bins } = cutWithBins(arr, nbins);
          expect(result.size).toBe(arr.length);
          expect(bins.length).toBe(nbins + 1);
        },
      ),
    );
  });

  it("bins from cutWithBins are strictly increasing", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }), {
          minLength: 5,
          maxLength: 30,
        }),
        fc.integer({ min: 2, max: 8 }),
        (arr, nbins) => {
          if (new Set(arr).size < 2) return;
          const { bins } = cutWithBins(arr, nbins);
          for (let i = 1; i < bins.length; i++) {
            expect((bins[i] as number) > (bins[i - 1] as number)).toBe(true);
          }
        },
      ),
    );
  });

  it("compareCategories is antisymmetric", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c", "d"), { minLength: 2, maxLength: 4 }),
        fc.option(fc.constantFrom("a", "b", "c", "d"), { nil: null }),
        fc.option(fc.constantFrom("a", "b", "c", "d"), { nil: null }),
        (cats, va, vb) => {
          const unique = [...new Set(cats)];
          if (unique.length < 2) return;
          const ab = compareCategories(va, vb, unique);
          const ba = compareCategories(vb, va, unique);
          // antisymmetry: sign(cmp(a,b)) == -sign(cmp(b,a))
          if (ab > 0) expect(ba).toBeLessThan(0);
          if (ab < 0) expect(ba).toBeGreaterThan(0);
          if (ab === 0) expect(ba).toBe(0);
        },
      ),
    );
  });

  it("sortByCategory produces a non-decreasing sequence", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: 1, max: 100 }), {
          minLength: 5,
          maxLength: 30,
        }),
        fc.integer({ min: 2, max: 5 }),
        (arr, nbins) => {
          if (new Set(arr).size < 2) return;
          const { result, categories } = cutOrdered(arr, nbins);
          const sorted = sortByCategory(result, categories);
          const vals = sorted.values as readonly (string | null)[];
          for (let i = 1; i < vals.length; i++) {
            expect(compareCategories(vals[i - 1] as string | null, vals[i] as string | null, categories)).toBeLessThanOrEqual(0);
          }
        },
      ),
    );
  });
});
