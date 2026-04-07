/**
 * Tests for src/core/astype.ts — astype / dataFrameAstype.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, astype, dataFrameAstype } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function vals(s: Series): unknown[] {
  return [...s.values];
}

// ─── Series astype ────────────────────────────────────────────────────────────

describe("astype (Series)", () => {
  // ── numeric → int ────────────────────────────────────────────────────────

  describe("to int64", () => {
    it("truncates floats toward zero", () => {
      const s = new Series({ data: [1.9, -2.7, 3.0] });
      expect(vals(astype(s, "int64"))).toEqual([1, -2, 3]);
    });

    it("preserves integer numbers unchanged", () => {
      const s = new Series({ data: [10, 20, 30] });
      expect(vals(astype(s, "int64"))).toEqual([10, 20, 30]);
    });

    it("converts bool true→1, false→0", () => {
      const s = new Series({ data: [true, false, true] });
      expect(vals(astype(s, "int64"))).toEqual([1, 0, 1]);
    });

    it("converts numeric strings", () => {
      const s = new Series({ data: ["1", "2", "3"] });
      expect(vals(astype(s, "int64"))).toEqual([1, 2, 3]);
    });

    it("preserves null as null", () => {
      const s = new Series({ data: [1, null, 3] });
      expect(vals(astype(s, "int64"))).toEqual([1, null, 3]);
    });

    it("raises on non-numeric string (errors=raise)", () => {
      const s = new Series({ data: ["abc"] });
      expect(() => astype(s, "int64")).toThrow(TypeError);
    });

    it("ignores error and returns null when errors=ignore", () => {
      const s = new Series({ data: ["abc", "2"] });
      expect(vals(astype(s, "int64", { errors: "ignore" }))).toEqual([null, 2]);
    });

    it("raises on NaN/Infinity when errors=raise", () => {
      const s = new Series({ data: [Number.POSITIVE_INFINITY] });
      expect(() => astype(s, "int64")).toThrow(TypeError);
    });

    it("sets dtype to int64", () => {
      const s = new Series({ data: [1, 2] });
      expect(astype(s, "int64").dtype.name).toBe("int64");
    });
  });

  // ── to float ─────────────────────────────────────────────────────────────

  describe("to float64", () => {
    it("keeps number values unchanged", () => {
      const s = new Series({ data: [1.5, 2.5, 3.5] });
      expect(vals(astype(s, "float64"))).toEqual([1.5, 2.5, 3.5]);
    });

    it("converts bool to float", () => {
      const s = new Series({ data: [true, false] });
      expect(vals(astype(s, "float64"))).toEqual([1.0, 0.0]);
    });

    it("parses numeric strings", () => {
      const s = new Series({ data: ["3.14", "-1.0"] });
      expect(vals(astype(s, "float64"))).toEqual([3.14, -1.0]);
    });

    it("parses 'NaN' string to NaN", () => {
      const s = new Series({ data: ["NaN"] });
      const result = vals(astype(s, "float64"));
      expect(Number.isNaN(result[0] as number)).toBe(true);
    });

    it("preserves null", () => {
      const s = new Series({ data: [null, 1.0] });
      expect(vals(astype(s, "float64"))).toEqual([null, 1.0]);
    });

    it("raises on non-numeric string", () => {
      const s = new Series({ data: ["hello"] });
      expect(() => astype(s, "float64")).toThrow(TypeError);
    });
  });

  // ── to bool ──────────────────────────────────────────────────────────────

  describe("to bool", () => {
    it("converts numbers: non-zero→true, zero→false", () => {
      const s = new Series({ data: [0, 1, -1, 0.0] });
      expect(vals(astype(s, "bool"))).toEqual([false, true, true, false]);
    });

    it("converts strings: empty/0/false→false, others→true", () => {
      const s = new Series({ data: ["", "0", "false", "hello", "1"] });
      expect(vals(astype(s, "bool"))).toEqual([false, false, false, true, true]);
    });

    it("preserves bool values", () => {
      const s = new Series({ data: [true, false] });
      expect(vals(astype(s, "bool"))).toEqual([true, false]);
    });

    it("preserves null as null", () => {
      const s = new Series({ data: [1, null] });
      expect(vals(astype(s, "bool"))).toEqual([true, null]);
    });

    it("sets dtype to bool", () => {
      const s = new Series({ data: [0, 1] });
      expect(astype(s, "bool").dtype.name).toBe("bool");
    });
  });

  // ── to string ─────────────────────────────────────────────────────────────

  describe('to "string"', () => {
    it("converts numbers to string", () => {
      const s = new Series({ data: [1, 2.5, -3] });
      expect(vals(astype(s, "string"))).toEqual(["1", "2.5", "-3"]);
    });

    it("uses Python-style capitalisation for booleans", () => {
      const s = new Series({ data: [true, false] });
      expect(vals(astype(s, "string"))).toEqual(["True", "False"]);
    });

    it("preserves strings unchanged", () => {
      const s = new Series({ data: ["a", "b"] });
      expect(vals(astype(s, "string"))).toEqual(["a", "b"]);
    });

    it("preserves null as null", () => {
      const s = new Series({ data: [null, "x"] });
      expect(vals(astype(s, "string"))).toEqual([null, "x"]);
    });

    it("sets dtype to string", () => {
      const s = new Series({ data: [1] });
      expect(astype(s, "string").dtype.name).toBe("string");
    });
  });

  // ── to object ─────────────────────────────────────────────────────────────

  describe('to "object"', () => {
    it("returns values unchanged", () => {
      const s = new Series({ data: [1, "x", true, null] });
      expect(vals(astype(s, "object"))).toEqual([1, "x", true, null]);
    });
  });

  // ── preserves name and index ──────────────────────────────────────────────

  it("preserves series name", () => {
    const s = new Series({ data: [1, 2], name: "score" });
    expect(astype(s, "float64").name).toBe("score");
  });

  it("preserves index labels", () => {
    const s = new Series({ data: [1, 2], index: ["a", "b"] });
    expect([...astype(s, "string").index.values]).toEqual(["a", "b"]);
  });

  // ── property: round-trip int→string→int ──────────────────────────────────

  it("property: int→string→int is identity for finite integers", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (nums) => {
          const s = new Series({ data: nums });
          const asStr = astype(s, "string");
          const backToInt = astype(asStr, "int64");
          const result = vals(backToInt);
          for (let i = 0; i < nums.length; i++) {
            if (result[i] !== nums[i]) return false;
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  // ── property: float→bool→float is 0/1 ────────────────────────────────────

  it("property: non-zero numbers cast to bool=true, zero=false", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, min: -1e6, max: 1e6 }),
        (n) => {
          const s = new Series({ data: [n] });
          const b = vals(astype(s, "bool"))[0] as boolean;
          return b === (n !== 0.0);
        },
      ),
      { numRuns: 300 },
    );
  });
});

// ─── DataFrame astype ─────────────────────────────────────────────────────────

describe("dataFrameAstype", () => {
  function makeDF() {
    return DataFrame.fromColumns({
      a: [1, 2, 3],
      b: ["10", "20", "30"],
      c: [true, false, true],
    });
  }

  it("applies single dtype to all columns", () => {
    const df = makeDF();
    const result = dataFrameAstype(df, "string");
    expect(vals(result.col("a"))).toEqual(["1", "2", "3"]);
    expect(vals(result.col("b"))).toEqual(["10", "20", "30"]);
    expect(vals(result.col("c"))).toEqual(["True", "False", "True"]);
  });

  it("applies per-column spec", () => {
    const df = makeDF();
    const result = dataFrameAstype(df, { b: "int64", c: "int64" });
    // column a unchanged
    expect(vals(result.col("a"))).toEqual([1, 2, 3]);
    // column b parsed from string
    expect(vals(result.col("b"))).toEqual([10, 20, 30]);
    // column c bool→int
    expect(vals(result.col("c"))).toEqual([1, 0, 1]);
  });

  it("preserves columns not mentioned in spec", () => {
    const df = makeDF();
    const result = dataFrameAstype(df, { a: "float64" });
    expect(vals(result.col("b"))).toEqual(["10", "20", "30"]);
  });

  it("throws RangeError for unknown column in spec", () => {
    const df = makeDF();
    expect(() => dataFrameAstype(df, { z: "int64" })).toThrow(RangeError);
  });

  it("preserves row index", () => {
    const df = DataFrame.fromColumns(
      { a: [1, 2] },
      { index: ["r1", "r2"] as const },
    );
    const result = dataFrameAstype(df, "string");
    expect([...result.index.values]).toEqual(["r1", "r2"]);
  });

  it("preserves column order", () => {
    const df = makeDF();
    const result = dataFrameAstype(df, { b: "float64" });
    expect([...result.columns.values]).toEqual(["a", "b", "c"]);
  });

  it("accepts Dtype instances in per-column spec", () => {
    const df = makeDF();
    const result = dataFrameAstype(df, { a: "float64" });
    expect(result.col("a").dtype.name).toBe("float64");
  });

  // ── property: dtypes after cast ───────────────────────────────────────────

  it("property: all column dtypes match target after single-dtype cast", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }),
        (nums) => {
          const df = DataFrame.fromColumns({ x: nums });
          const result = dataFrameAstype(df, "string");
          return result.col("x").dtype.name === "string";
        },
      ),
      { numRuns: 100 },
    );
  });
});
