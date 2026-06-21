/**
 * Tests for IntegerArray — nullable integer extension array.
 */

import { describe, expect, it } from "bun:test";
import { IntegerArray } from "../../../src/core/arrays/integer_array.ts";

describe("IntegerArray", () => {
  describe("from()", () => {
    it("creates from plain numbers", () => {
      const a = IntegerArray.from([1, 2, 3]);
      expect(a.toArray()).toEqual([1, 2, 3]);
      expect(a.dtype).toBe("Int64");
    });

    it("creates with explicit dtype", () => {
      const a = IntegerArray.from([1, 2, 3], "Int32");
      expect(a.dtype).toBe("Int32");
    });

    it("handles null and undefined as NA", () => {
      const a = IntegerArray.from([1, null, 3, undefined, 5]);
      expect(a.toArray()).toEqual([1, null, 3, null, 5]);
      expect(a.isna()).toEqual([false, true, false, true, false]);
    });

    it("truncates to integer", () => {
      const a = IntegerArray.from([1.7, -2.3]);
      expect(a.toArray()).toEqual([1, -2]);
    });

    it("supports all integer dtypes", () => {
      for (const dtype of [
        "Int8", "Int16", "Int32", "Int64",
        "UInt8", "UInt16", "UInt32", "UInt64",
      ] as const) {
        const a = IntegerArray.from([1, 2, 3], dtype);
        expect(a.dtype).toBe(dtype);
      }
    });

    it("throws on out-of-bounds for Int8", () => {
      expect(() => IntegerArray.from([128], "Int8")).toThrow();
      expect(() => IntegerArray.from([-129], "Int8")).toThrow();
    });

    it("throws on unknown dtype", () => {
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
      expect(() => IntegerArray.from([1], "int8" as any)).toThrow();
    });
  });

  describe("size", () => {
    it("includes NA elements", () => {
      const a = IntegerArray.from([1, null, 3]);
      expect(a.size).toBe(3);
    });
  });

  describe("at()", () => {
    it("returns value by index", () => {
      const a = IntegerArray.from([10, 20, 30]);
      expect(a.at(0)).toBe(10);
      expect(a.at(2)).toBe(30);
    });

    it("returns null for masked positions", () => {
      const a = IntegerArray.from([1, null, 3]);
      expect(a.at(1)).toBeNull();
    });

    it("supports negative indices", () => {
      const a = IntegerArray.from([1, 2, 3]);
      expect(a.at(-1)).toBe(3);
    });

    it("returns null for out-of-bounds", () => {
      const a = IntegerArray.from([1, 2]);
      expect(a.at(5)).toBeNull();
    });
  });

  describe("isna / notna", () => {
    it("isna() returns mask", () => {
      const a = IntegerArray.from([1, null, 3]);
      expect(a.isna()).toEqual([false, true, false]);
    });

    it("notna() returns inverse mask", () => {
      const a = IntegerArray.from([1, null, 3]);
      expect(a.notna()).toEqual([true, false, true]);
    });

    it("hasNa() detects missing values", () => {
      expect(IntegerArray.from([1, null]).hasNa()).toBe(true);
      expect(IntegerArray.from([1, 2]).hasNa()).toBe(false);
    });
  });

  describe("toArray()", () => {
    it("returns array with nulls for NA", () => {
      const a = IntegerArray.from([1, null, 3]);
      expect(a.toArray()).toEqual([1, null, 3]);
    });
  });

  describe("toArrayFilled()", () => {
    it("replaces NA with fill value", () => {
      const a = IntegerArray.from([1, null, 3]);
      expect(a.toArrayFilled(0)).toEqual([1, 0, 3]);
    });
  });

  describe("dropna()", () => {
    it("drops NA elements", () => {
      const a = IntegerArray.from([1, null, 3, null, 5]);
      expect(a.dropna()).toEqual([1, 3, 5]);
    });
  });

  describe("fillna()", () => {
    it("fills NA with value", () => {
      const a = IntegerArray.from([1, null, 3]);
      expect(a.fillna(0).toArray()).toEqual([1, 0, 3]);
    });

    it("returns a new array", () => {
      const a = IntegerArray.from([1, null]);
      const b = a.fillna(0);
      expect(b).not.toBe(a);
    });
  });

  describe("sum()", () => {
    it("sums non-NA elements", () => {
      const a = IntegerArray.from([1, null, 3, null, 5]);
      expect(a.sum()).toBe(9);
    });

    it("returns 0 for all-NA with skipna=true", () => {
      const a = IntegerArray.from([null, null]);
      expect(a.sum()).toBe(0);
    });

    it("returns null for all-NA with skipna=false", () => {
      const a = IntegerArray.from([null, null]);
      expect(a.sum(false)).toBeNull();
    });
  });

  describe("mean()", () => {
    it("returns mean of non-NA elements", () => {
      const a = IntegerArray.from([1, null, 3]);
      expect(a.mean()).toBe(2);
    });

    it("returns null for empty/all-NA", () => {
      const a = IntegerArray.from([null]);
      expect(a.mean()).toBeNull();
    });
  });

  describe("min() / max()", () => {
    it("min returns minimum non-NA", () => {
      expect(IntegerArray.from([3, 1, null, 2]).min()).toBe(1);
    });

    it("max returns maximum non-NA", () => {
      expect(IntegerArray.from([3, 1, null, 2]).max()).toBe(3);
    });

    it("min returns null for all-NA", () => {
      expect(IntegerArray.from([null]).min()).toBeNull();
    });
  });

  describe("count()", () => {
    it("counts non-NA elements", () => {
      expect(IntegerArray.from([1, null, 3]).count()).toBe(2);
    });
  });

  describe("arithmetic", () => {
    it("add by scalar", () => {
      const a = IntegerArray.from([1, null, 3], "Int32");
      expect(a.add(10).toArray()).toEqual([11, null, 13]);
    });

    it("add two arrays", () => {
      const a = IntegerArray.from([1, null, 3], "Int32");
      const b = IntegerArray.from([10, 20, null], "Int32");
      expect(a.add(b).toArray()).toEqual([11, null, null]);
    });

    it("sub by scalar", () => {
      const a = IntegerArray.from([10, null, 30], "Int32");
      expect(a.sub(5).toArray()).toEqual([5, null, 25]);
    });

    it("mul by scalar", () => {
      const a = IntegerArray.from([2, null, 3], "Int32");
      expect(a.mul(3).toArray()).toEqual([6, null, 9]);
    });

    it("floordiv", () => {
      const a = IntegerArray.from([10, null, 15], "Int32");
      expect(a.floordiv(3).toArray()).toEqual([3, null, 5]);
    });

    it("mod", () => {
      const a = IntegerArray.from([10, null, 7], "Int32");
      expect(a.mod(3).toArray()).toEqual([1, null, 1]);
    });

    it("throws on size mismatch", () => {
      const a = IntegerArray.from([1, 2, 3], "Int32");
      const b = IntegerArray.from([1, 2], "Int32");
      expect(() => a.add(b)).toThrow();
    });
  });

  describe("astype()", () => {
    it("converts to another dtype", () => {
      const a = IntegerArray.from([1, null, 3], "Int32");
      const b = a.astype("Int64");
      expect(b.dtype).toBe("Int64");
      expect(b.toArray()).toEqual([1, null, 3]);
    });
  });

  describe("iteration", () => {
    it("iterates over elements", () => {
      const a = IntegerArray.from([1, null, 3]);
      expect([...a]).toEqual([1, null, 3]);
    });
  });

  describe("toString()", () => {
    it("renders dtype and values", () => {
      const s = IntegerArray.from([1, null, 3]).toString();
      expect(s).toContain("Int64");
      expect(s).toContain("<NA>");
    });
  });
});
