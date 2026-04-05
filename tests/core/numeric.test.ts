/**
 * Tests for to_numeric.
 */
import { describe, expect, it } from "bun:test";
import { Series, toNumeric, toNumericArray, toNumericSeries } from "../../src/index.ts";

describe("toNumeric", () => {
  it("converts number → number unchanged", () => {
    expect(toNumeric(3.14)).toBe(3.14);
    expect(toNumeric(0)).toBe(0);
  });

  it("converts boolean → 0 / 1", () => {
    expect(toNumeric(true)).toBe(1);
    expect(toNumeric(false)).toBe(0);
  });

  it("converts null / undefined → NaN", () => {
    expect(Number.isNaN(toNumeric(null))).toBe(true);
    expect(Number.isNaN(toNumeric(undefined))).toBe(true);
  });

  it("converts numeric strings", () => {
    expect(toNumeric("42")).toBe(42);
    expect(toNumeric("3.14")).toBe(3.14);
    expect(toNumeric("-7")).toBe(-7);
    expect(toNumeric("1e3")).toBe(1000);
  });

  it("converts special strings", () => {
    expect(Number.isNaN(toNumeric("nan"))).toBe(true);
    expect(toNumeric("inf")).toBe(Number.POSITIVE_INFINITY);
    expect(toNumeric("-inf")).toBe(Number.NEGATIVE_INFINITY);
  });

  it("raises on non-numeric string by default", () => {
    expect(() => toNumeric("hello")).toThrow(TypeError);
  });

  it("coerces non-numeric string to NaN when errors='coerce'", () => {
    expect(Number.isNaN(toNumeric("hello", "coerce"))).toBe(true);
  });

  it("converts bigint", () => {
    expect(toNumeric(BigInt(99))).toBe(99);
  });

  it("converts Date to timestamp", () => {
    const d = new Date("2020-01-01T00:00:00.000Z");
    expect(toNumeric(d)).toBe(d.getTime());
  });
});

describe("toNumericArray", () => {
  it("converts array of mixed values", () => {
    const result = toNumericArray([1, "2", true, null]);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(1);
    expect(Number.isNaN(result[3] ?? Number.NaN)).toBe(true);
  });

  it("raises on bad string in array", () => {
    expect(() => toNumericArray(["bad"])).toThrow(TypeError);
  });
});

describe("toNumericSeries", () => {
  it("converts string series to float64", () => {
    const s = new Series({ data: ["1.5", "2.5", "3.5"] });
    const result = toNumericSeries(s);
    expect(result.iloc(0)).toBe(1.5);
    expect(result.iloc(1)).toBe(2.5);
  });

  it("downcasts to int64 when all integers", () => {
    const s = new Series({ data: ["1", "2", "3"] });
    const result = toNumericSeries(s, { downcast: true });
    expect(result.dtype.name).toBe("int64");
  });

  it("coerces bad values when errors='coerce'", () => {
    const s = new Series({ data: ["1", "bad", "3"] });
    const result = toNumericSeries(s, { errors: "coerce" });
    expect(result.iloc(0)).toBe(1);
    expect(Number.isNaN(result.iloc(1) as number)).toBe(true);
  });

  it("preserves original values when errors='ignore'", () => {
    const s = new Series({ data: ["1", "bad", "3"] });
    const result = toNumericSeries(s, { errors: "ignore" });
    // "bad" can't convert; original is kept
    expect(result.iloc(1)).toBe("bad");
  });
});
