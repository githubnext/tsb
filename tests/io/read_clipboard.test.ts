import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import { readClipboard, toClipboard } from "../../src/io/read_clipboard.ts";

describe("readClipboard", () => {
  it("parses TSV with header", () => {
    const text = "a\tb\tc\n1\t2\t3\n4\t5\t6";
    const df = readClipboard(text);
    expect(df.shape[0]).toBe(2);
    expect(df.shape[1]).toBe(3);
    expect(df.columns.values).toEqual(["a", "b", "c"]);
    expect(df.get("a")?.values[0]).toBe(1);
    expect(df.get("c")?.values[1]).toBe(6);
  });

  it("parses CSV with header", () => {
    const text = "x,y\n10,20\n30,40";
    const df = readClipboard(text, { sep: "," });
    expect(df.shape[0]).toBe(2);
    expect(df.get("x")?.values[0]).toBe(10);
    expect(df.get("y")?.values[1]).toBe(40);
  });

  it("auto-detects tab as separator", () => {
    const text = "col1\tcol2\n1.5\t2.5";
    const df = readClipboard(text);
    expect(df.get("col1")?.values[0]).toBeCloseTo(1.5);
  });

  it("auto-detects comma when no tabs present", () => {
    const text = "a,b\n1,2";
    const df = readClipboard(text);
    expect(df.get("a")?.values[0]).toBe(1);
  });

  it("converts NA values to null", () => {
    const text = "a\tb\n1\tNA\n2\t";
    const df = readClipboard(text);
    expect(df.get("b")?.values[0]).toBeNull();
    expect(df.get("b")?.values[1]).toBeNull();
  });

  it("parses boolean values", () => {
    const text = "flag\nTrue\nFalse\ntrue";
    const df = readClipboard(text);
    expect(df.get("flag")?.values[0]).toBe(true);
    expect(df.get("flag")?.values[1]).toBe(false);
  });

  it("treats non-numeric strings as strings", () => {
    const text = "name\tval\nalice\t1\nbob\t2";
    const df = readClipboard(text);
    expect(df.get("name")?.values[0]).toBe("alice");
    expect(df.get("name")?.values[1]).toBe("bob");
  });

  it("handles no-header option", () => {
    const text = "1\t2\t3";
    const df = readClipboard(text, { header: false });
    expect(df.columns.values).toEqual(["0", "1", "2"]);
    expect(df.get("0")?.values[0]).toBe(1);
  });

  it("handles Windows CRLF line endings", () => {
    const text = "a\tb\r\n1\t2\r\n3\t4";
    const df = readClipboard(text);
    expect(df.shape[0]).toBe(2);
    expect(df.get("a")?.values[0]).toBe(1);
    expect(df.get("b")?.values[1]).toBe(4);
  });

  it("returns empty DataFrame for empty text", () => {
    const df = readClipboard("");
    expect(df.shape[0]).toBe(0);
  });

  it("returns empty DataFrame for whitespace-only text", () => {
    const df = readClipboard("   \n  ");
    expect(df.shape[0]).toBe(0);
  });

  it("handles header-only with no data rows", () => {
    const df = readClipboard("a\tb\tc");
    expect(df.shape[0]).toBe(0);
    expect(df.columns.values).toEqual(["a", "b", "c"]);
  });

  it("handles quoted CSV fields", () => {
    const text = 'name,value\n"Alice, Jr.",42\n"Bob",7';
    const df = readClipboard(text, { sep: "," });
    expect(df.get("name")?.values[0]).toBe("Alice, Jr.");
    expect(df.get("value")?.values[0]).toBe(42);
    expect(df.get("name")?.values[1]).toBe("Bob");
  });
});

describe("toClipboard", () => {
  it("serializes DataFrame to TSV by default", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = toClipboard(df);
    expect(result).toBe("a\tb\n1\t3\n2\t4");
  });

  it("uses custom separator", () => {
    const df = DataFrame.fromColumns({ x: [1], y: [2] });
    const result = toClipboard(df, { sep: "," });
    expect(result).toBe("x,y\n1,2");
  });

  it("omits header when header=false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = toClipboard(df, { header: false });
    expect(result).toBe("1\t3\n2\t4");
  });

  it("includes index when index=true", () => {
    const df = DataFrame.fromColumns({ a: [10, 20] });
    const result = toClipboard(df, { index: true });
    const lines = result.split("\n");
    expect(lines[0]).toBe("\ta");
    expect(lines[1]).toContain("10");
  });

  it("uses naRep for null values", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] });
    const result = toClipboard(df, { naRep: "N/A" });
    const lines = result.split("\n");
    expect(lines[2]).toBe("N/A");
  });

  it("round-trips through readClipboard", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1000, max: 1000, noNaN: true }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.float({ min: -1000, max: 1000, noNaN: true }), { minLength: 1, maxLength: 5 }),
        (col1, col2) => {
          const n = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({ x: col1.slice(0, n), y: col2.slice(0, n) });
          const text = toClipboard(df);
          const df2 = readClipboard(text);
          if (df2.shape[0] !== n || df2.shape[1] !== 2) {
            return false;
          }
          for (let i = 0; i < n; i++) {
            const v1 = df.get("x")?.values[i];
            const v2 = df2.get("x")?.values[i];
            if (typeof v1 === "number" && typeof v2 === "number" && Math.abs(v1 - v2) > 1e-6) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
