/**
 * Tests for src/core/json.ts
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { jsonNormalize, flattenJson } from "../../src/index.ts";

// ─── basic normalization ──────────────────────────────────────────────────────

describe("jsonNormalize", () => {
  test("flat records → DataFrame with correct columns", () => {
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    const df = jsonNormalize(data);
    expect(df.columns.values).toEqual(["id", "name"]);
    expect(df.shape).toEqual([2, 2]);
  });

  test("nested objects are flattened with separator", () => {
    const data = [
      { id: 1, user: { name: "Alice", age: 30 } },
      { id: 2, user: { name: "Bob", age: 25 } },
    ];
    const df = jsonNormalize(data);
    expect(df.columns.values).toContain("user.name");
    expect(df.columns.values).toContain("user.age");
    expect(df.columns.values).toContain("id");
    expect(df.col("user.name").values).toEqual(["Alice", "Bob"]);
  });

  test("custom separator", () => {
    const data = [{ a: { b: 1 } }];
    const df = jsonNormalize(data, { sep: "_" });
    expect(df.columns.values).toContain("a_b");
  });

  test("deeply nested objects", () => {
    const data = [{ a: { b: { c: 42 } } }];
    const df = jsonNormalize(data);
    expect(df.columns.values).toContain("a.b.c");
    expect(df.col("a.b.c").values).toEqual([42]);
  });

  test("maxLevel limits flattening depth", () => {
    const data = [{ a: { b: { c: 42 } } }];
    const df = jsonNormalize(data, { maxLevel: 1 });
    // With maxLevel=1 we only go one level deep, so a.b becomes a string
    expect(df.columns.values).toContain("a.b");
    // a.b.c should NOT exist as a column
    expect(df.columns.values).not.toContain("a.b.c");
  });

  test("arrays are serialized as strings", () => {
    const data = [{ tags: ["x", "y"] }];
    const df = jsonNormalize(data);
    const val = df.col("tags").values[0];
    expect(typeof val).toBe("string");
  });

  test("missing key in one record → null in that row", () => {
    const data = [
      { id: 1, extra: "yes" },
      { id: 2 },
    ];
    const df = jsonNormalize(data);
    expect(df.col("extra").values[0]).toBe("yes");
    expect(df.col("extra").values[1]).toBeNull();
  });

  test("empty array → empty DataFrame", () => {
    const df = jsonNormalize([]);
    expect(df.shape[0]).toBe(0);
  });

  test("recordPath navigates nested list", () => {
    const data = [
      { id: 1, items: [{ v: 10 }, { v: 20 }] },
      { id: 2, items: [{ v: 30 }] },
    ];
    const df = jsonNormalize(data, { recordPath: ["items"] });
    expect(df.shape[0]).toBe(3);
    expect(df.columns.values).toContain("v");
  });

  test("recordPath with meta", () => {
    const data = [
      { id: 1, items: [{ v: 10 }, { v: 20 }] },
      { id: 2, items: [{ v: 30 }] },
    ];
    const df = jsonNormalize(data, { recordPath: ["items"], meta: ["id"] });
    expect(df.columns.values).toContain("id");
    expect(df.col("id").values).toEqual([1, 1, 2]);
  });

  test("multi-level recordPath", () => {
    const data = [{ data: { rows: [{ x: 1 }, { x: 2 }] } }];
    const df = jsonNormalize(data, { recordPath: ["data", "rows"] });
    expect(df.shape[0]).toBe(2);
    expect(df.col("x").values).toEqual([1, 2]);
  });

  test("single flat record", () => {
    const data = [{ a: 1, b: "hello", c: true }];
    const df = jsonNormalize(data);
    expect(df.col("a").values[0]).toBe(1);
    expect(df.col("b").values[0]).toBe("hello");
    expect(df.col("c").values[0]).toBe(true);
  });
});

// ─── flattenJson ──────────────────────────────────────────────────────────────

describe("flattenJson", () => {
  test("flattens nested object", () => {
    const result = flattenJson({ a: { b: 1, c: 2 }, d: 3 });
    expect(result["a.b"]).toBe(1);
    expect(result["a.c"]).toBe(2);
    expect(result["d"]).toBe(3);
  });

  test("custom separator", () => {
    const result = flattenJson({ x: { y: 1 } }, "__");
    expect(result["x__y"]).toBe(1);
  });

  test("maxLevel=0 does not flatten", () => {
    const result = flattenJson({ a: { b: 1 } }, ".", 0);
    // depth 0 means don't recurse into objects
    expect(typeof result["a"]).toBe("string");
  });

  test("scalar values pass through", () => {
    const result = flattenJson({ x: 42, y: "hi", z: true });
    expect(result["x"]).toBe(42);
    expect(result["y"]).toBe("hi");
    expect(result["z"]).toBe(true);
  });
});

// ─── property-based ──────────────────────────────────────────────────────────

describe("jsonNormalize property tests", () => {
  test("output row count equals input record count (no recordPath)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.integer(), val: fc.string() }),
          { minLength: 0, maxLength: 20 },
        ),
        (records) => {
          const df = jsonNormalize(records);
          return records.length === 0 ? df.shape[0] === 0 : df.shape[0] === records.length;
        },
      ),
    );
  });

  test("flattenJson round-trips flat objects", () => {
    fc.assert(
      fc.property(
        fc.record({
          a: fc.integer(),
          b: fc.string(),
          c: fc.boolean(),
        }),
        (rec) => {
          const flat = flattenJson(rec);
          return flat["a"] === rec.a && flat["b"] === rec.b && flat["c"] === rec.c;
        },
      ),
    );
  });
});
