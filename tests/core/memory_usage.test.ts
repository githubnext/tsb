import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { dataFrameMemoryUsage, memoryUsage } from "../../src/core/memory_usage.ts";
import { DataFrame, Dtype, Series } from "../../src/index.ts";

describe("memoryUsage", () => {
  it("estimates int32 Series: 4 bytes per element", () => {
    const s = new Series({ data: [1, 2, 3], dtype: Dtype.from("int32") });
    expect(memoryUsage(s)).toBe(12);
  });

  it("estimates float64 Series: 8 bytes per element", () => {
    const s = new Series({ data: [1.0, 2.0, 3.0, 4.0], dtype: Dtype.from("float64") });
    expect(memoryUsage(s)).toBe(32);
  });

  it("estimates int8 Series: 1 byte per element", () => {
    const s = new Series({ data: [1, 2], dtype: Dtype.from("int8") });
    expect(memoryUsage(s)).toBe(2);
  });

  it("estimates bool Series: 1 byte per element", () => {
    const s = new Series({ data: [true, false, true], dtype: Dtype.from("bool") });
    expect(memoryUsage(s)).toBe(3);
  });

  it("estimates string Series: 2*len+56 per non-null string", () => {
    const s = new Series({ data: ["hi", "bye"], dtype: Dtype.from("string") });
    // "hi" => 2*2+56=60, "bye" => 2*3+56=62
    expect(memoryUsage(s)).toBe(60 + 62);
  });

  it("includes index memory when index=true", () => {
    const s = new Series({ data: [1, 2, 3], dtype: Dtype.from("float64") });
    const without = memoryUsage(s);
    const with_ = memoryUsage(s, { index: true });
    // index: 3 * 8 = 24 extra
    expect(with_ - without).toBe(24);
  });

  it("deep mode: measures actual value sizes", () => {
    const s = new Series({ data: [1, 2, 3] });
    const deepBytes = memoryUsage(s, { deep: true });
    expect(deepBytes).toBe(24); // 3 * 8 bytes per number
  });

  it("deep mode: strings are sized by content", () => {
    const s = new Series({ data: ["a", "bb", "ccc"] });
    const deepBytes = memoryUsage(s, { deep: true });
    // "a"=2+56=58, "bb"=4+56=60, "ccc"=6+56=62
    expect(deepBytes).toBe(58 + 60 + 62);
  });

  it("deep mode: null values contribute 0 bytes", () => {
    const s = new Series({ data: [null, null] });
    expect(memoryUsage(s, { deep: true })).toBe(0);
  });

  it("datetime dtype: 8 bytes per element", () => {
    const s = new Series({ data: [new Date(), new Date()], dtype: Dtype.from("datetime") });
    expect(memoryUsage(s)).toBe(16);
  });

  it("empty Series returns 0", () => {
    const s = new Series({ data: [] });
    expect(memoryUsage(s)).toBe(0);
  });

  // Property: memory usage >= 0 for any data
  it("property: memory usage is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string({ maxLength: 5 }), fc.constant(null)), {
          minLength: 0,
          maxLength: 20,
        }),
        (data) => {
          const s = new Series({ data });
          expect(memoryUsage(s)).toBeGreaterThanOrEqual(0);
          expect(memoryUsage(s, { deep: true })).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});

describe("dataFrameMemoryUsage", () => {
  it("returns a Series<number> indexed by column name", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const usage = dataFrameMemoryUsage(df);
    expect(usage.values.length).toBe(2);
    expect([...usage.index.values]).toContain("a");
    expect([...usage.index.values]).toContain("b");
    for (const v of usage.values) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("includes Index entry when index=true", () => {
    const df = DataFrame.fromColumns({ x: [1, 2] });
    const usage = dataFrameMemoryUsage(df, { index: true });
    expect([...usage.index.values]).toContain("Index");
    expect(usage.values.length).toBe(2); // Index + x
  });

  it("does not include Index entry by default", () => {
    const df = DataFrame.fromColumns({ x: [1, 2] });
    const usage = dataFrameMemoryUsage(df);
    expect([...usage.index.values]).not.toContain("Index");
    expect(usage.values.length).toBe(1);
  });

  it("returns empty Series for empty DataFrame", () => {
    const df = DataFrame.fromColumns({});
    const usage = dataFrameMemoryUsage(df);
    expect(usage.values.length).toBe(0);
  });

  it("mixed dtypes: numeric + string columns", () => {
    const df = DataFrame.fromColumns({
      num: [1.0, 2.0],
      str: ["hello", "world"],
    });
    const usage = dataFrameMemoryUsage(df);
    const numIdx = [...usage.index.values].indexOf("num");
    const strIdx = [...usage.index.values].indexOf("str");
    // num: 2 elements, unknown dtype (object by default) = 2*8=16 or string-based
    expect(usage.values[numIdx] ?? 0).toBeGreaterThan(0);
    expect(usage.values[strIdx] ?? 0).toBeGreaterThan(0);
  });
});
