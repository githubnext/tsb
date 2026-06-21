/**
 * Tests for StringArray — nullable string extension array.
 */

import { describe, expect, it } from "bun:test";
import { StringArray } from "../../../src/core/arrays/string_array.ts";

describe("StringArray", () => {
  describe("from()", () => {
    it("creates from strings", () => {
      const a = StringArray.from(["a", "b", "c"]);
      expect(a.toArray()).toEqual(["a", "b", "c"]);
      expect(a.dtype).toBe("string");
    });

    it("handles null and undefined as NA", () => {
      const a = StringArray.from(["a", null, "c", undefined]);
      expect(a.toArray()).toEqual(["a", null, "c", null]);
    });

    it("coerces non-strings", () => {
      // biome-ignore lint/suspicious/noExplicitAny: testing type coercion
      const a = StringArray.from(["hello", null, "world"]);
      expect(a.size).toBe(3);
    });
  });

  describe("size", () => {
    it("includes NA", () => {
      expect(StringArray.from(["a", null]).size).toBe(2);
    });
  });

  describe("at()", () => {
    it("returns value or null", () => {
      const a = StringArray.from(["a", null, "c"]);
      expect(a.at(0)).toBe("a");
      expect(a.at(1)).toBeNull();
      expect(a.at(-1)).toBe("c");
    });
  });

  describe("isna / notna", () => {
    it("isna()", () => {
      expect(StringArray.from(["a", null]).isna()).toEqual([false, true]);
    });

    it("notna()", () => {
      expect(StringArray.from(["a", null]).notna()).toEqual([true, false]);
    });
  });

  describe("upper() / lower()", () => {
    it("uppercases non-NA", () => {
      expect(StringArray.from(["hello", null, "WORLD"]).upper().toArray()).toEqual([
        "HELLO", null, "WORLD",
      ]);
    });

    it("lowercases non-NA", () => {
      expect(StringArray.from(["Hello", null, "WORLD"]).lower().toArray()).toEqual([
        "hello", null, "world",
      ]);
    });
  });

  describe("strip() / lstrip() / rstrip()", () => {
    it("strips whitespace", () => {
      expect(StringArray.from(["  hi  ", null]).strip().toArray()).toEqual(["hi", null]);
    });

    it("lstrip removes leading whitespace", () => {
      expect(StringArray.from(["  hi  "]).lstrip().toArray()).toEqual(["hi  "]);
    });

    it("rstrip removes trailing whitespace", () => {
      expect(StringArray.from(["  hi  "]).rstrip().toArray()).toEqual(["  hi"]);
    });
  });

  describe("contains()", () => {
    it("checks substring", () => {
      const result = StringArray.from(["abc", null, "xyz"]).contains("b");
      expect(result.toArray()).toEqual([true, null, false]);
    });

    it("checks regex", () => {
      const result = StringArray.from(["abc", "xyz"]).contains(/^a/);
      expect(result.toArray()).toEqual([true, false]);
    });
  });

  describe("startswith() / endswith()", () => {
    it("startswith", () => {
      const result = StringArray.from(["abc", null, "xyz"]).startswith("a");
      expect(result.toArray()).toEqual([true, null, false]);
    });

    it("endswith", () => {
      const result = StringArray.from(["abc", null, "xyz"]).endswith("z");
      expect(result.toArray()).toEqual([false, null, true]);
    });
  });

  describe("replace()", () => {
    it("replaces occurrences", () => {
      expect(
        StringArray.from(["aaba", null]).replace("a", "x").toArray(),
      ).toEqual(["xxbx", null]);
    });
  });

  describe("zfill()", () => {
    it("zero-pads strings", () => {
      expect(StringArray.from(["42", null, "5"]).zfill(4).toArray()).toEqual([
        "0042", null, "0005",
      ]);
    });
  });

  describe("len()", () => {
    it("returns string lengths", () => {
      expect(StringArray.from(["hi", null, "world"]).len().toArray()).toEqual([2, null, 5]);
    });
  });

  describe("cat()", () => {
    it("concatenates two arrays", () => {
      const a = StringArray.from(["a", "b"]);
      const b = StringArray.from(["x", "y"]);
      expect(a.cat("-", b).toArray()).toEqual(["a-x", "b-y"]);
    });

    it("propagates NA", () => {
      const a = StringArray.from(["a", null]);
      const b = StringArray.from(["x", "y"]);
      expect(a.cat("-", b).toArray()).toEqual(["a-x", null]);
    });

    it("throws on size mismatch", () => {
      expect(() => StringArray.from(["a"]).cat("-", StringArray.from(["x", "y"]))).toThrow();
    });
  });

  describe("fillna()", () => {
    it("fills NA with value", () => {
      expect(StringArray.from(["a", null]).fillna("x").toArray()).toEqual(["a", "x"]);
    });
  });

  describe("dropna()", () => {
    it("removes NA elements", () => {
      expect(StringArray.from(["a", null, "c"]).dropna()).toEqual(["a", "c"]);
    });
  });

  describe("count()", () => {
    it("counts non-NA", () => {
      expect(StringArray.from(["a", null, "c"]).count()).toBe(2);
    });
  });

  describe("iteration", () => {
    it("iterates over elements", () => {
      expect([...StringArray.from(["a", null, "c"])]).toEqual(["a", null, "c"]);
    });
  });

  describe("toString()", () => {
    it("renders dtype and values", () => {
      const s = StringArray.from(["hi", null]).toString();
      expect(s).toContain("string");
      expect(s).toContain("<NA>");
    });
  });
});
