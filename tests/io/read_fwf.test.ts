/**
 * Tests for read_fwf — fixed-width format file reader.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { readFwf } from "../../src/index.ts";

// ─── basic parsing ────────────────────────────────────────────────────────────

describe("readFwf — basic parsing", () => {
  const SAMPLE = [
    "Name         Age  City",
    "Alice         30  New York",
    "Bob           25  LA",
    "Carol         35  Chicago",
  ].join("\n");

  it("infers columns from whitespace patterns", () => {
    const df = readFwf(SAMPLE);
    expect(df.columns).toContain("Name");
    expect(df.columns).toContain("Age");
    expect(df.shape[0]).toBe(3);
  });

  it("parses numeric values as numbers", () => {
    const df = readFwf(SAMPLE);
    const ages = df.col("Age").values;
    expect(ages[0]).toBe(30);
    expect(ages[1]).toBe(25);
    expect(ages[2]).toBe(35);
  });

  it("parses string values correctly", () => {
    const df = readFwf(SAMPLE);
    const names = df.col("Name").values;
    expect(names[0]).toBe("Alice");
    expect(names[1]).toBe("Bob");
    expect(names[2]).toBe("Carol");
  });
});

// ─── explicit colspecs ────────────────────────────────────────────────────────

describe("readFwf — explicit colspecs", () => {
  it("uses supplied colspecs", () => {
    const text = "AAAA0001\nBBBB0002\nCCCC0003";
    const df = readFwf(text, {
      colspecs: [
        [0, 4],
        [4, 8],
      ],
      header: null,
    });
    expect(df.shape).toEqual([3, 2]);
    expect(df.col("col0").values[0]).toBe("AAAA");
    expect(df.col("col1").values[0]).toBe(1);
  });
});

// ─── widths ───────────────────────────────────────────────────────────────────

describe("readFwf — widths option", () => {
  it("parses using widths array", () => {
    const text = "Alice 30NYC\nBob   25LA ";
    const df = readFwf(text, {
      widths: [6, 2, 3],
      header: null,
      names: ["name", "age", "city"],
    });
    expect([...df.columns.values]).toEqual(["name", "age", "city"]);
    expect(df.col("age").values[0]).toBe(30);
    expect(df.col("city").values[0]).toBe("NYC");
  });
});

// ─── header options ───────────────────────────────────────────────────────────

describe("readFwf — header options", () => {
  it("header=null generates auto names", () => {
    const text = "Alice  30\nBob    25";
    const df = readFwf(text, { header: null });
    expect(df.columns.values[0]).toBe("col0");
    expect(df.columns.values[1]).toBe("col1");
    expect(df.shape[0]).toBe(2);
  });

  it("names override column names", () => {
    const text = "Name  Age\nAlice  30\nBob    25";
    const df = readFwf(text, { names: ["person", "years"] });
    expect(df.columns.values[0]).toBe("person");
    expect(df.columns.values[1]).toBe("years");
  });
});

// ─── skiprows and nrows ───────────────────────────────────────────────────────

describe("readFwf — skiprows and nrows", () => {
  const LINES = ["Name  Age", "Alice  30", "Bob    25", "Carol  35", "Dave   40"].join("\n");

  it("skiprows skips leading rows", () => {
    const df = readFwf(LINES, { skiprows: 2, header: null });
    // After skipping 2 rows: "Bob    25", "Carol  35", "Dave   40"
    expect(df.shape[0]).toBe(3);
  });

  it("nrows limits data rows", () => {
    const df = readFwf(LINES, { nrows: 2 });
    expect(df.shape[0]).toBe(2);
    expect(df.col("Name").values[0]).toBe("Alice");
    expect(df.col("Name").values[1]).toBe("Bob");
  });

  it("nrows=0 returns empty DataFrame with columns", () => {
    const df = readFwf(LINES, { nrows: 0 });
    expect(df.shape[0]).toBe(0);
    expect(df.columns.size).toBeGreaterThan(0);
  });
});

// ─── NA values ────────────────────────────────────────────────────────────────

describe("readFwf — NA values", () => {
  it("parses built-in NA strings as null", () => {
    const text = "A    B\nNA   1\nNaN  2\n     3";
    const df = readFwf(text);
    const a = df.col("A").values;
    expect(a[0]).toBeNull();
    expect(a[1]).toBeNull();
    expect(a[2]).toBeNull();
  });

  it("parses custom NA strings as null", () => {
    const text = "A  B\n-  1\n?  2\n3  4";
    const df = readFwf(text, { naValues: ["-", "?"] });
    const a = df.col("A").values;
    expect(a[0]).toBeNull();
    expect(a[1]).toBeNull();
    expect(a[2]).toBe(3);
  });
});

// ─── boolean and type parsing ─────────────────────────────────────────────────

describe("readFwf — type inference", () => {
  it("parses true/false as booleans", () => {
    const text = "flag  val\ntrue  1\nfalse 0";
    const df = readFwf(text);
    expect(df.col("flag").values[0]).toBe(true);
    expect(df.col("flag").values[1]).toBe(false);
  });

  it("parses floats correctly", () => {
    const text = "x       y\n3.14    2.72\n1e3     0.1";
    const df = readFwf(text);
    expect(df.col("x").values[0]).toBeCloseTo(3.14);
    expect(df.col("y").values[0]).toBeCloseTo(2.72);
    expect(df.col("x").values[1]).toBe(1000);
  });
});

// ─── empty and edge cases ─────────────────────────────────────────────────────

describe("readFwf — edge cases", () => {
  it("empty string returns empty DataFrame", () => {
    const df = readFwf("");
    expect(df.shape[0]).toBe(0);
  });

  it("header only (no data rows) returns empty DataFrame with columns", () => {
    const df = readFwf("Name  Age");
    expect(df.shape[0]).toBe(0);
    expect(df.columns.size).toBeGreaterThan(0);
  });

  it("handles Windows CRLF line endings", () => {
    const text = "A  B\r\n1  2\r\n3  4";
    const df = readFwf(text);
    expect(df.shape[0]).toBe(2);
    expect(df.col("A").values[0]).toBe(1);
  });

  it("handles tab-separated content via explicit colspecs", () => {
    const text = "col0      col1\nhello     world\nfoo       bar";
    const df = readFwf(text, {
      colspecs: [
        [0, 10],
        [10, 20],
      ],
    });
    expect(df.col("col0").values[0]).toBe("hello");
    expect(df.col("col1").values[0]).toBe("world");
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("readFwf — property tests", () => {
  it("shape[0] equals number of non-blank data lines", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 1, max: 99 }), fc.integer({ min: 0, max: 999 })), {
          minLength: 1,
          maxLength: 20,
        }),
        (rows) => {
          const lines = rows.map(([a, b]) => {
            const aStr = String(a).padEnd(5);
            const bStr = String(b).padStart(6);
            return `${aStr}${bStr}`;
          });
          const text = ["col1  col2 ", ...lines].join("\n");
          const df = readFwf(text);
          expect(df.shape[0]).toBe(rows.length);
        },
      ),
    );
  });

  it("colspecs parsing is consistent with widths parsing for rectangular data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 1, max: 9 }), fc.integer({ min: 1, max: 9 })), {
          minLength: 1,
          maxLength: 5,
        }),
        (rows) => {
          const widths = [4, 4];
          const lines = rows.map(([a, b]) => String(a).padStart(4) + String(b).padStart(4));
          const text = lines.join("\n");
          const df1 = readFwf(text, { header: null, widths });
          const df2 = readFwf(text, {
            header: null,
            colspecs: [
              [0, 4],
              [4, 8],
            ],
          });
          expect(df1.shape).toEqual(df2.shape);
          const vals1 = df1.col("col0").values;
          const vals2 = df2.col("col0").values;
          expect(vals1).toEqual(vals2);
        },
      ),
    );
  });
});
