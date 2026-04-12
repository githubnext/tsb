/**
 * Tests for jsonNormalize — semi-structured JSON flattening.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { jsonNormalize } from "../../src/index.ts";

// ─── Basic flattening ─────────────────────────────────────────────────────────

describe("jsonNormalize — basic", () => {
  it("flattens a single flat object", () => {
    const df = jsonNormalize({ a: 1, b: "x", c: true });
    expect(df.shape).toEqual([1, 3]);
    expect(df.columns.values).toEqual(["a", "b", "c"]);
    expect(df.at(0, "a")).toBe(1);
    expect(df.at(0, "b")).toBe("x");
    expect(df.at(0, "c")).toBe(true);
  });

  it("flattens an array of flat objects", () => {
    const df = jsonNormalize([
      { a: 1, b: "x" },
      { a: 2, b: "y" },
    ]);
    expect(df.shape).toEqual([2, 2]);
    expect(df.at(0, "a")).toBe(1);
    expect(df.at(1, "b")).toBe("y");
  });

  it("returns an empty DataFrame for an empty array", () => {
    const df = jsonNormalize([]);
    expect(df.shape[0]).toBe(0);
  });

  it("handles null values", () => {
    const df = jsonNormalize([{ a: 1, b: null }]);
    expect(df.at(0, "b")).toBeNull();
  });
});

// ─── Nested flattening ────────────────────────────────────────────────────────

describe("jsonNormalize — nested objects", () => {
  it("flattens nested objects with default sep='.'", () => {
    const df = jsonNormalize([
      { id: 1, name: { first: "Alice", last: "Smith" } },
      { id: 2, name: { first: "Bob", last: "Jones" } },
    ]);
    expect(df.columns.values).toContain("name.first");
    expect(df.columns.values).toContain("name.last");
    expect(df.at(0, "name.first")).toBe("Alice");
    expect(df.at(1, "name.last")).toBe("Jones");
    expect(df.columns.values).not.toContain("name");
  });

  it("uses a custom sep", () => {
    const df = jsonNormalize([{ a: { b: 1 } }], { sep: "_" });
    expect(df.columns.values).toContain("a_b");
    expect(df.at(0, "a_b")).toBe(1);
  });

  it("respects maxLevel=0 (no flattening)", () => {
    const df = jsonNormalize([{ a: { b: 1 } }], { maxLevel: 0 });
    expect(df.columns.values).toContain("a");
    // The nested object should be stringified
    const val = df.at(0, "a");
    expect(typeof val).toBe("string");
  });

  it("respects maxLevel=1 (one level deep)", () => {
    const df = jsonNormalize([{ a: { b: { c: 42 } } }], { maxLevel: 1 });
    expect(df.columns.values).toContain("a.b");
    // a.b.c should not be flattened further — a.b is stringified
    expect(df.columns.values).not.toContain("a.b.c");
  });

  it("flattens three levels deep by default", () => {
    const df = jsonNormalize([{ a: { b: { c: 42 } } }]);
    expect(df.columns.values).toContain("a.b.c");
    expect(df.at(0, "a.b.c")).toBe(42);
  });
});

// ─── recordPath ───────────────────────────────────────────────────────────────

describe("jsonNormalize — recordPath", () => {
  it("unpacks a top-level array of records", () => {
    const data = {
      school: "MIT",
      students: [
        { name: "Alice", grade: "A" },
        { name: "Bob", grade: "B" },
      ],
    };
    const df = jsonNormalize(data, { recordPath: "students" });
    expect(df.shape).toEqual([2, 2]);
    expect(df.at(0, "name")).toBe("Alice");
    expect(df.at(1, "grade")).toBe("B");
  });

  it("unpacks a nested array via path array", () => {
    const data = {
      school: { name: "MIT", students: [{ id: 1 }, { id: 2 }] },
    };
    const df = jsonNormalize(data, { recordPath: ["school", "students"] });
    expect(df.shape).toEqual([2, 1]);
    expect(df.at(0, "id")).toBe(1);
  });

  it("produces one row per record across multiple parents", () => {
    const data = [
      { group: "A", items: [{ v: 1 }, { v: 2 }] },
      { group: "B", items: [{ v: 3 }] },
    ];
    const df = jsonNormalize(data, { recordPath: "items" });
    expect(df.shape[0]).toBe(3);
  });

  it("returns empty DataFrame when recordPath yields no records", () => {
    const df = jsonNormalize({ items: [] }, { recordPath: "items" });
    expect(df.shape[0]).toBe(0);
  });
});

// ─── meta ─────────────────────────────────────────────────────────────────────

describe("jsonNormalize — meta", () => {
  it("includes scalar meta fields alongside each record row", () => {
    const data = [
      { school: "MIT", students: [{ name: "Alice" }, { name: "Bob" }] },
      { school: "Harvard", students: [{ name: "Carol" }] },
    ];
    const df = jsonNormalize(data, { recordPath: "students", meta: ["school"] });
    expect(df.shape).toEqual([3, 2]);
    expect(df.at(0, "school")).toBe("MIT");
    expect(df.at(1, "school")).toBe("MIT");
    expect(df.at(2, "school")).toBe("Harvard");
  });

  it("includes nested meta fields via path array", () => {
    const data = [
      { info: { city: "NYC" }, items: [{ x: 1 }] },
    ];
    const df = jsonNormalize(data, {
      recordPath: "items",
      meta: [["info", "city"]],
    });
    expect(df.at(0, "info.city")).toBe("NYC");
  });

  it("applies metaPrefix to meta column names", () => {
    const data = [{ tag: "v1", rows: [{ n: 1 }] }];
    const df = jsonNormalize(data, {
      recordPath: "rows",
      meta: ["tag"],
      metaPrefix: "meta_",
    });
    expect(df.columns.values).toContain("meta_tag");
    expect(df.at(0, "meta_tag")).toBe("v1");
  });

  it("handles missing meta fields with errors='ignore'", () => {
    const data = [{ rows: [{ n: 1 }] }]; // no "tag" field
    const df = jsonNormalize(data, {
      recordPath: "rows",
      meta: ["tag"],
      errors: "ignore",
    });
    expect(df.at(0, "tag")).toBeNull();
  });
});

// ─── recordPrefix ─────────────────────────────────────────────────────────────

describe("jsonNormalize — recordPrefix", () => {
  it("applies recordPrefix to record column names", () => {
    const df = jsonNormalize([{ a: 1 }], { recordPrefix: "rec_" });
    expect(df.columns.values).toContain("rec_a");
    expect(df.at(0, "rec_a")).toBe(1);
  });

  it("applies recordPrefix when using recordPath", () => {
    const df = jsonNormalize(
      { items: [{ x: 10 }] },
      { recordPath: "items", recordPrefix: "item_" },
    );
    expect(df.columns.values).toContain("item_x");
    expect(df.at(0, "item_x")).toBe(10);
  });
});

// ─── Arrays inside records (serialised) ──────────────────────────────────────

describe("jsonNormalize — array values", () => {
  it("serialises nested arrays to JSON strings", () => {
    const df = jsonNormalize([{ tags: ["a", "b"] }]);
    const val = df.at(0, "tags");
    expect(typeof val).toBe("string");
    expect(val).toBe('["a","b"]');
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("jsonNormalize — property tests", () => {
  it("number of rows equals number of input objects (flat mode)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ a: fc.integer(), b: fc.string() }), { minLength: 0, maxLength: 20 }),
        (rows) => {
          const df = jsonNormalize(rows);
          return df.shape[0] === rows.length;
        },
      ),
    );
  });

  it("column count equals key count for uniform flat objects", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ x: fc.integer(), y: fc.float(), z: fc.boolean() }),
          { minLength: 1, maxLength: 10 },
        ),
        (rows) => {
          const df = jsonNormalize(rows);
          return df.shape[1] === 3;
        },
      ),
    );
  });

  it("single-object shorthand equals single-element array", () => {
    fc.assert(
      fc.property(
        fc.record({ a: fc.integer(), b: fc.string() }),
        (obj) => {
          const df1 = jsonNormalize(obj);
          const df2 = jsonNormalize([obj]);
          return (
            df1.shape[0] === df2.shape[0] &&
            df1.shape[1] === df2.shape[1]
          );
        },
      ),
    );
  });

  it("meta columns appear in every row regardless of record count", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            tag: fc.string({ minLength: 1, maxLength: 8 }),
            items: fc.array(fc.record({ v: fc.integer() }), { minLength: 1, maxLength: 5 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        (data) => {
          const df = jsonNormalize(data, { recordPath: "items", meta: ["tag"] });
          if (df.shape[0] === 0) return true;
          return df.columns.values.includes("tag");
        },
      ),
    );
  });
});
