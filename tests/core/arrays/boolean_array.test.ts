/**
 * Tests for BooleanArray — nullable boolean extension array.
 */

import { describe, expect, it } from "bun:test";
import { BooleanArray } from "../../../src/core/arrays/boolean_array.ts";

describe("BooleanArray", () => {
  describe("from()", () => {
    it("creates from booleans", () => {
      const a = BooleanArray.from([true, false, true]);
      expect(a.toArray()).toEqual([true, false, true]);
      expect(a.dtype).toBe("boolean");
    });

    it("handles null and undefined as NA", () => {
      const a = BooleanArray.from([true, null, false, undefined]);
      expect(a.toArray()).toEqual([true, null, false, null]);
    });
  });

  describe("size", () => {
    it("includes NA elements", () => {
      expect(BooleanArray.from([true, null]).size).toBe(2);
    });
  });

  describe("at()", () => {
    it("returns value or null", () => {
      const a = BooleanArray.from([true, null, false]);
      expect(a.at(0)).toBe(true);
      expect(a.at(1)).toBeNull();
      expect(a.at(2)).toBe(false);
    });
  });

  describe("isna / notna", () => {
    it("isna()", () => {
      expect(BooleanArray.from([true, null]).isna()).toEqual([false, true]);
    });

    it("notna()", () => {
      expect(BooleanArray.from([true, null]).notna()).toEqual([true, false]);
    });
  });

  describe("any()", () => {
    it("returns true if any element is true", () => {
      expect(BooleanArray.from([false, null, true]).any()).toBe(true);
    });

    it("returns false if no true elements", () => {
      expect(BooleanArray.from([false, null, false]).any()).toBe(false);
    });

    it("returns null for all-NA with skipna=false", () => {
      expect(BooleanArray.from([null]).any(false)).toBeNull();
    });
  });

  describe("all()", () => {
    it("returns true if all non-NA elements are true", () => {
      expect(BooleanArray.from([true, null, true]).all()).toBe(true);
    });

    it("returns false if any false", () => {
      expect(BooleanArray.from([true, false, null]).all()).toBe(false);
    });

    it("returns null for all-NA with skipna=false", () => {
      expect(BooleanArray.from([null]).all(false)).toBeNull();
    });
  });

  describe("sum()", () => {
    it("counts true elements", () => {
      expect(BooleanArray.from([true, null, false, true]).sum()).toBe(2);
    });
  });

  describe("logical operations", () => {
    it("and: both known", () => {
      const a = BooleanArray.from([true, false, true, false]);
      const b = BooleanArray.from([true, true, false, false]);
      expect(a.and(b).toArray()).toEqual([true, false, false, false]);
    });

    it("or: both known", () => {
      const a = BooleanArray.from([true, false, true, false]);
      const b = BooleanArray.from([true, true, false, false]);
      expect(a.or(b).toArray()).toEqual([true, true, true, false]);
    });

    it("not()", () => {
      const a = BooleanArray.from([true, null, false]);
      expect(a.not().toArray()).toEqual([false, null, true]);
    });

    it("throws on size mismatch", () => {
      const a = BooleanArray.from([true, false]);
      const b = BooleanArray.from([true]);
      expect(() => a.and(b)).toThrow();
    });
  });

  describe("fillna()", () => {
    it("fills NA with false", () => {
      expect(BooleanArray.from([true, null]).fillna(false).toArray()).toEqual([true, false]);
    });

    it("fills NA with true", () => {
      expect(BooleanArray.from([null, false]).fillna(true).toArray()).toEqual([true, false]);
    });
  });

  describe("dropna()", () => {
    it("removes NA elements", () => {
      expect(BooleanArray.from([true, null, false]).dropna()).toEqual([true, false]);
    });
  });

  describe("iteration", () => {
    it("iterates over elements", () => {
      const a = BooleanArray.from([true, null, false]);
      expect([...a]).toEqual([true, null, false]);
    });
  });

  describe("toString()", () => {
    it("renders dtype and values", () => {
      const s = BooleanArray.from([true, null]).toString();
      expect(s).toContain("boolean");
      expect(s).toContain("<NA>");
    });
  });
});
