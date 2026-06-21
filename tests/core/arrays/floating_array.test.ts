/**
 * Tests for FloatingArray — nullable float extension array.
 */

import { describe, expect, it } from "bun:test";
import { FloatingArray } from "../../../src/core/arrays/floating_array.ts";

describe("FloatingArray", () => {
  describe("from()", () => {
    it("creates from plain numbers", () => {
      const a = FloatingArray.from([1.5, 2.5, 3.5]);
      expect(a.toArray()).toEqual([1.5, 2.5, 3.5]);
      expect(a.dtype).toBe("Float64");
    });

    it("creates Float32 array", () => {
      const a = FloatingArray.from([1.0, 2.0, 3.0], "Float32");
      expect(a.dtype).toBe("Float32");
    });

    it("handles null and undefined as NA", () => {
      const a = FloatingArray.from([1.1, null, 3.3, undefined]);
      expect(a.toArray()).toEqual([1.1, null, 3.3, null]);
    });

    it("treats NaN as NA", () => {
      const a = FloatingArray.from([1.0, NaN, 3.0]);
      expect(a.toArray()).toEqual([1.0, null, 3.0]);
    });

    it("throws on unknown dtype", () => {
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
      expect(() => FloatingArray.from([1], "float64" as any)).toThrow();
    });
  });

  describe("at()", () => {
    it("returns element or null", () => {
      const a = FloatingArray.from([1.1, null, 3.3]);
      expect(a.at(0)).toBeCloseTo(1.1);
      expect(a.at(1)).toBeNull();
    });
  });

  describe("isna / notna", () => {
    it("isna()", () => {
      expect(FloatingArray.from([1.0, null]).isna()).toEqual([false, true]);
    });

    it("notna()", () => {
      expect(FloatingArray.from([1.0, null]).notna()).toEqual([true, false]);
    });
  });

  describe("sum()", () => {
    it("sums non-NA elements", () => {
      expect(FloatingArray.from([1.5, null, 2.5]).sum()).toBeCloseTo(4.0);
    });

    it("returns null for all-NA with skipna=false", () => {
      expect(FloatingArray.from([null]).sum(false)).toBeNull();
    });
  });

  describe("mean()", () => {
    it("returns mean", () => {
      expect(FloatingArray.from([1.0, null, 3.0]).mean()).toBeCloseTo(2.0);
    });
  });

  describe("std()", () => {
    it("returns sample std deviation", () => {
      const a = FloatingArray.from([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]);
      expect(a.std()).toBeCloseTo(2.0);
    });

    it("returns null for single element", () => {
      expect(FloatingArray.from([1.0]).std()).toBeNull();
    });
  });

  describe("min() / max()", () => {
    it("min returns minimum", () => {
      expect(FloatingArray.from([3.0, null, 1.0]).min()).toBeCloseTo(1.0);
    });

    it("max returns maximum", () => {
      expect(FloatingArray.from([3.0, null, 1.0]).max()).toBeCloseTo(3.0);
    });
  });

  describe("count()", () => {
    it("counts non-NA", () => {
      expect(FloatingArray.from([1.0, null, 3.0]).count()).toBe(2);
    });
  });

  describe("arithmetic", () => {
    it("add scalar", () => {
      const a = FloatingArray.from([1.0, null, 3.0]);
      expect(a.add(1.0).toArray()).toEqual([2.0, null, 4.0]);
    });

    it("add two arrays, NA propagates", () => {
      const a = FloatingArray.from([1.0, null, 3.0]);
      const b = FloatingArray.from([0.5, 1.0, null]);
      const c = a.add(b).toArray();
      expect(c[0]).toBeCloseTo(1.5);
      expect(c[1]).toBeNull();
      expect(c[2]).toBeNull();
    });

    it("mul scalar", () => {
      const a = FloatingArray.from([2.0, null]);
      expect(a.mul(3.0).toArray()).toEqual([6.0, null]);
    });

    it("truediv", () => {
      const a = FloatingArray.from([6.0, null]);
      const res = a.truediv(2.0).toArray();
      expect(res[0]).toBeCloseTo(3.0);
      expect(res[1]).toBeNull();
    });

    it("throws on size mismatch", () => {
      const a = FloatingArray.from([1.0, 2.0]);
      const b = FloatingArray.from([1.0]);
      expect(() => a.add(b)).toThrow();
    });
  });

  describe("fillna()", () => {
    it("fills NA with value", () => {
      const a = FloatingArray.from([1.0, null, 3.0]);
      expect(a.fillna(0.0).toArray()).toEqual([1.0, 0.0, 3.0]);
    });
  });

  describe("astype()", () => {
    it("converts dtype", () => {
      const a = FloatingArray.from([1.5, null], "Float64");
      const b = a.astype("Float32");
      expect(b.dtype).toBe("Float32");
    });
  });

  describe("iteration", () => {
    it("iterates over elements", () => {
      const result = [...FloatingArray.from([1.0, null, 3.0])];
      expect(result[0]).toBeCloseTo(1.0);
      expect(result[1]).toBeNull();
      expect(result[2]).toBeCloseTo(3.0);
    });
  });

  describe("toString()", () => {
    it("renders dtype and values", () => {
      const s = FloatingArray.from([1.5, null]).toString();
      expect(s).toContain("Float64");
      expect(s).toContain("<NA>");
    });
  });
});
