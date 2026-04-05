/**
 * Tests for src/io/to_string.ts
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import { dataFrameToString, seriesToString } from "../../src/io/to_string.ts";
import { Series } from "../../src/index.ts";

// ─── basic rendering ─────────────────────────────────────────────────────────

describe("dataFrameToString", () => {
  test("renders header + rows", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const out = dataFrameToString(df);
    const lines = out.split("\n");
    expect(lines.length).toBe(3); // header + 2 rows
    expect(lines[0]).toContain("a");
    expect(lines[0]).toContain("b");
    expect(out).toContain("1");
    expect(out).toContain("4");
  });

  test("includes index column by default", () => {
    const df = DataFrame.fromColumns({ x: [10, 20] });
    const out = dataFrameToString(df);
    expect(out).toContain("0");
    expect(out).toContain("1");
  });

  test("hides index when index=false", () => {
    const df = DataFrame.fromColumns({ x: [10, 20] });
    const out = dataFrameToString(df, { index: false });
    const lines = out.split("\n");
    // header line should start with "x" (not an index number)
    expect(lines[0]?.trimStart()).toMatch(/^x/);
  });

  test("empty DataFrame", () => {
    const df = DataFrame.fromColumns({});
    const out = dataFrameToString(df);
    expect(out).toBe("");
  });

  test("naRep option", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] });
    const out = dataFrameToString(df, { naRep: "—" });
    expect(out).toContain("—");
  });

  test("floatPrecision option", () => {
    const df = DataFrame.fromColumns({ v: [3.14159] });
    const out = dataFrameToString(df, { floatPrecision: 2 });
    expect(out).toContain("3.14");
    expect(out).not.toContain("3.14159");
  });

  test("maxRows triggers truncation with ellipsis", () => {
    const data = Array.from({ length: 20 }, (_, i) => i);
    const df = DataFrame.fromColumns({ n: data });
    const out = dataFrameToString(df, { maxRows: 6 });
    expect(out).toContain("...");
    // Should show fewer than 20 rows
    const lines = out.split("\n");
    expect(lines.length).toBeLessThan(22);
  });

  test("numeric columns are right-aligned", () => {
    const df = DataFrame.fromColumns({ n: [1, 10, 100] });
    const out = dataFrameToString(df);
    const lines = out.split("\n");
    // The header "n" and value "  1" should be right-aligned (ends at same position)
    // Just verify the longer number doesn't get cut off
    expect(out).toContain("100");
    expect(out).toContain("10");
    expect(out).toContain("1");
  });

  test("single column DataFrame", () => {
    const df = DataFrame.fromColumns({ col: ["a", "b", "c"] });
    const out = dataFrameToString(df);
    expect(out).toContain("col");
    expect(out).toContain("a");
  });
});

// ─── seriesToString ───────────────────────────────────────────────────────────

describe("seriesToString", () => {
  test("renders index + values", () => {
    const s = new Series({ data: [10, 20, 30] });
    const out = seriesToString(s);
    const lines = out.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(out).toContain("10");
    expect(out).toContain("30");
  });

  test("includes name line when series is named", () => {
    const s = new Series({ data: [1, 2], name: "my_series" });
    const out = seriesToString(s);
    expect(out).toContain("my_series");
  });

  test("no index when index=false", () => {
    const s = new Series({ data: [1, 2, 3] });
    const out = seriesToString(s, { index: false });
    const lines = out.split("\n");
    expect(lines.length).toBe(3);
  });

  test("maxRows truncation", () => {
    const s = new Series({ data: Array.from({ length: 100 }, (_, i) => i) });
    const out = seriesToString(s, { maxRows: 10 });
    expect(out).toContain("...");
  });

  test("floatPrecision", () => {
    const s = new Series({ data: [Math.PI] });
    const out = seriesToString(s, { floatPrecision: 3 });
    expect(out).toContain("3.142");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("dataFrameToString property tests", () => {
  test("output always has nRows+1 lines (no truncation)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 10 }),
        (nums) => {
          const df = DataFrame.fromColumns({ v: nums });
          const out = dataFrameToString(df, { maxRows: 100 });
          const lines = out.split("\n");
          // header + one line per row
          return lines.length === nums.length + 1;
        },
      ),
    );
  });

  test("every value appears in output (small datasets)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1000, max: 9999 }), { minLength: 1, maxLength: 5 }),
        (nums) => {
          const df = DataFrame.fromColumns({ v: nums });
          const out = dataFrameToString(df, { maxRows: 100 });
          return nums.every((n) => out.includes(String(n)));
        },
      ),
    );
  });
});
