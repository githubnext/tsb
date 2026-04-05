/**
 * Tests for src/core/eval.ts
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { evalDataFrame, queryDataFrame } from "../../src/index.ts";
import { DataFrame } from "../../src/index.ts";

// ─── evalDataFrame ────────────────────────────────────────────────────────────

describe("evalDataFrame", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });

  test("addition", () => {
    expect(evalDataFrame(df, "a + b").values).toEqual([5, 7, 9]);
  });

  test("subtraction", () => {
    expect(evalDataFrame(df, "b - a").values).toEqual([3, 3, 3]);
  });

  test("multiplication", () => {
    expect(evalDataFrame(df, "a * b").values).toEqual([4, 10, 18]);
  });

  test("division", () => {
    expect(evalDataFrame(df, "b / a").values).toEqual([4, 2.5, 2]);
  });

  test("modulo", () => {
    expect(evalDataFrame(df, "b % a").values).toEqual([0, 1, 0]);
  });

  test("power", () => {
    expect(evalDataFrame(df, "a ** 2").values).toEqual([1, 4, 9]);
  });

  test("less than", () => {
    expect(evalDataFrame(df, "a < 2").values).toEqual([true, false, false]);
  });

  test("greater than", () => {
    expect(evalDataFrame(df, "a > 2").values).toEqual([false, false, true]);
  });

  test("less than or equal", () => {
    expect(evalDataFrame(df, "a <= 2").values).toEqual([true, true, false]);
  });

  test("greater than or equal", () => {
    expect(evalDataFrame(df, "b >= 5").values).toEqual([false, true, true]);
  });

  test("equality", () => {
    expect(evalDataFrame(df, "a == 2").values).toEqual([false, true, false]);
  });

  test("inequality", () => {
    expect(evalDataFrame(df, "a != 2").values).toEqual([true, false, true]);
  });

  test("logical and (Python style)", () => {
    const result = evalDataFrame(df, "a > 1 and b < 6").values;
    expect(result).toEqual([false, true, false]);
  });

  test("logical or (Python style)", () => {
    const result = evalDataFrame(df, "a == 1 or b == 6").values;
    expect(result).toEqual([true, false, true]);
  });

  test("logical not", () => {
    const result = evalDataFrame(df, "not (a == 1)").values;
    expect(result).toEqual([false, true, true]);
  });

  test("parentheses grouping", () => {
    expect(evalDataFrame(df, "(a + b) * 2").values).toEqual([10, 14, 18]);
  });

  test("numeric literal", () => {
    expect(evalDataFrame(df, "a + 10").values).toEqual([11, 12, 13]);
  });

  test("string literal equality", () => {
    const df2 = DataFrame.fromColumns({ name: ["Alice", "Bob", "Alice"] });
    const result = evalDataFrame(df2, "name == 'Alice'").values;
    expect(result).toEqual([true, false, true]);
  });

  test("double-quoted string literal", () => {
    const df2 = DataFrame.fromColumns({ name: ["Alice", "Bob"] });
    const result = evalDataFrame(df2, 'name == "Bob"').values;
    expect(result).toEqual([false, true]);
  });

  test("boolean literals", () => {
    const df2 = DataFrame.fromColumns({ flag: [true, false, true] });
    const result = evalDataFrame(df2, "flag == true").values;
    expect(result).toEqual([true, false, true]);
  });

  test("unary negation", () => {
    expect(evalDataFrame(df, "-a").values).toEqual([-1, -2, -3]);
  });

  test("backtick-quoted column name", () => {
    const df2 = DataFrame.fromColumns({ "col name": [1, 2, 3] });
    const result = evalDataFrame(df2, "`col name` + 1").values;
    expect(result).toEqual([2, 3, 4]);
  });

  test("throws SyntaxError for invalid expression", () => {
    expect(() => evalDataFrame(df, "a +")).toThrow(SyntaxError);
  });

  test("throws ReferenceError for unknown column", () => {
    expect(() => evalDataFrame(df, "z + 1")).toThrow(ReferenceError);
  });

  test("result has same index as source DataFrame", () => {
    const result = evalDataFrame(df, "a + b");
    expect(result.index.values).toEqual(df.index.values);
  });

  test("logical && operator", () => {
    const result = evalDataFrame(df, "a > 1 && b < 6").values;
    expect(result).toEqual([false, true, false]);
  });

  test("logical || operator", () => {
    const result = evalDataFrame(df, "a == 1 || a == 3").values;
    expect(result).toEqual([true, false, true]);
  });
});

// ─── queryDataFrame ───────────────────────────────────────────────────────────

describe("queryDataFrame", () => {
  test("filters rows with simple comparison", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    const result = queryDataFrame(df, "a > 3");
    expect(result.shape[0]).toBe(2);
    expect(result.col("a").values).toEqual([4, 5]);
  });

  test("preserves all columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = queryDataFrame(df, "a > 1");
    expect(result.columns.values).toEqual(["a", "b"]);
    expect(result.shape).toEqual([2, 2]);
  });

  test("empty result when no rows match", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = queryDataFrame(df, "a > 100");
    expect(result.shape[0]).toBe(0);
  });

  test("all rows when all match", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = queryDataFrame(df, "a > 0");
    expect(result.shape[0]).toBe(3);
  });

  test("filters by string value", () => {
    const df = DataFrame.fromColumns({ name: ["Alice", "Bob", "Alice"] });
    const result = queryDataFrame(df, "name == 'Alice'");
    expect(result.shape[0]).toBe(2);
  });

  test("compound condition", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
    const result = queryDataFrame(df, "a > 1 and b < 40");
    expect(result.col("a").values).toEqual([2, 3]);
  });

  test("preserves original index values", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = queryDataFrame(df, "a > 1");
    expect(result.index.values).toEqual([1, 2]);
  });
});

// ─── property-based ──────────────────────────────────────────────────────────

describe("eval property tests", () => {
  test("a + b == b + a (commutativity)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 10 }),
        (aVals, bVals) => {
          const len = Math.min(aVals.length, bVals.length);
          const a = aVals.slice(0, len);
          const b = bVals.slice(0, len);
          const df = DataFrame.fromColumns({ a, b });
          const ab = evalDataFrame(df, "a + b").values;
          const ba = evalDataFrame(df, "b + a").values;
          return ab.every((v, i) => v === ba[i]);
        },
      ),
    );
  });

  test("queryDataFrame result rows satisfy the condition", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 100 }),
        (values, threshold) => {
          const df = DataFrame.fromColumns({ v: values });
          const result = queryDataFrame(df, `v > ${threshold}`);
          const resultVals = result.col("v").values;
          return resultVals.every((v) => (v as number) > threshold);
        },
      ),
    );
  });
});
