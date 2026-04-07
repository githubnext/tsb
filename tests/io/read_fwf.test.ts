/**
 * Tests for src/io/read_fwf.ts — readFwf().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { readFwf } from "../../src/index.ts";

// ─── basic parsing ────────────────────────────────────────────────────────────

describe("readFwf — basic parsing", () => {
  it("parses a simple fixed-width table with a header", () => {
    const text = [
      "Name       Age  Score",
      "Alice       29   88.5",
      "Bob         34   91.0",
    ].join("\n");
    const df = readFwf(text);
    expect(df.shape).toEqual([2, 3]);
    expect([...df.columns.values]).toEqual(["Name", "Age", "Score"]);
    expect([...df.col("Name").values]).toEqual(["Alice", "Bob"]);
    expect([...df.col("Age").values]).toEqual([29, 34]);
    expect([...df.col("Score").values]).toEqual([88.5, 91.0]);
  });

  it("infers integer dtype", () => {
    const text = "x    y\n10   20\n30   40";
    const df = readFwf(text);
    expect(df.col("x").dtype.name).toBe("int64");
    expect(df.col("y").dtype.name).toBe("int64");
  });

  it("infers float dtype", () => {
    const text = "val\n1.5\n2.5\n3.0";
    const df = readFwf(text);
    expect(df.col("val").dtype.name).toBe("float64");
    expect([...df.col("val").values]).toEqual([1.5, 2.5, 3.0]);
  });

  it("infers boolean dtype", () => {
    const text = "flag\ntrue\nfalse\ntrue";
    const df = readFwf(text);
    expect(df.col("flag").dtype.name).toBe("bool");
    expect([...df.col("flag").values]).toEqual([true, false, true]);
  });

  it("infers string dtype", () => {
    const text = "word\nhello\nworld";
    const df = readFwf(text);
    expect(df.col("word").dtype.name).toBe("string");
  });

  it("handles single-column text", () => {
    const text = "value\n42\n99\n7";
    const df = readFwf(text);
    expect(df.shape).toEqual([3, 1]);
    expect([...df.col("value").values]).toEqual([42, 99, 7]);
  });
});

// ─── explicit colspecs ────────────────────────────────────────────────────────

describe("readFwf — explicit colspecs", () => {
  it("uses provided colspecs", () => {
    const text = "Alice 29\nBob   34";
    const df = readFwf(text, {
      colspecs: [
        [0, 6],
        [6, 8],
      ],
      header: null,
      names: ["Name", "Age"],
    });
    expect([...df.col("Name").values]).toEqual(["Alice", "Bob"]);
    expect([...df.col("Age").values]).toEqual([29, 34]);
  });

  it("extracts overlapping slices correctly", () => {
    const text = "ABCDEFGH\n12345678";
    const df = readFwf(text, {
      colspecs: [
        [0, 4],
        [4, 8],
      ],
    });
    expect([...df.col("ABCD").values]).toEqual(["1234"]);
    expect([...df.col("EFGH").values]).toEqual(["5678"]);
  });
});

// ─── widths ────────────────────────────────────────────────────────────────────

describe("readFwf — widths", () => {
  it("converts widths to colspecs", () => {
    const text = "NameAge\nAlice29\nBob  34";
    const df = readFwf(text, {
      widths: [5, 2],
    });
    expect([...df.col("Name").values]).toEqual(["Alice", "Bob"]);
    expect([...df.col("Age").values]).toEqual([29, 34]);
  });

  it("three-column widths", () => {
    const text = "AABBCC\n112233\n445566";
    const df = readFwf(text, { widths: [2, 2, 2] });
    expect(df.shape).toEqual([2, 3]);
  });
});

// ─── header options ───────────────────────────────────────────────────────────

describe("readFwf — header options", () => {
  it("header=null generates numeric column names", () => {
    const text = "Alice 29\nBob   34";
    const df = readFwf(text, {
      header: null,
      colspecs: [
        [0, 6],
        [6, 8],
      ],
    });
    expect([...df.columns.values]).toEqual(["0", "1"]);
    expect([...df.col("0").values]).toEqual(["Alice", "Bob"]);
  });

  it("explicit names override header row", () => {
    const text = "x    y\n1    2\n3    4";
    const df = readFwf(text, { names: ["A", "B"] });
    expect([...df.columns.values]).toEqual(["A", "B"]);
    expect([...df.col("A").values]).toEqual([1, 3]);
  });
});

// ─── skipRows / nRows ─────────────────────────────────────────────────────────

describe("readFwf — skipRows and nRows", () => {
  it("skips rows after header", () => {
    const text = "val\n10\n20\n30\n40";
    const df = readFwf(text, { skipRows: 1 });
    expect([...df.col("val").values]).toEqual([20, 30, 40]);
  });

  it("limits rows with nRows", () => {
    const text = "val\n10\n20\n30\n40";
    const df = readFwf(text, { nRows: 2 });
    expect([...df.col("val").values]).toEqual([10, 20]);
  });

  it("skipRows and nRows together", () => {
    const text = "val\n10\n20\n30\n40";
    const df = readFwf(text, { skipRows: 1, nRows: 2 });
    expect([...df.col("val").values]).toEqual([20, 30]);
  });
});

// ─── comment lines ────────────────────────────────────────────────────────────

describe("readFwf — comment", () => {
  it("strips lines starting with comment character", () => {
    const text = "# This is a comment\nval\n# another comment\n10\n20";
    const df = readFwf(text, { comment: "#" });
    expect([...df.col("val").values]).toEqual([10, 20]);
  });

  it("handles % comment char", () => {
    const text = "x\n% ignore\n5\n% ignore\n6";
    const df = readFwf(text, { comment: "%" });
    expect([...df.col("x").values]).toEqual([5, 6]);
  });
});

// ─── missing values ───────────────────────────────────────────────────────────

describe("readFwf — naValues", () => {
  it("treats empty cells as null", () => {
    const text = "a    b\n1    \n2    3";
    const df = readFwf(text, {
      colspecs: [
        [0, 5],
        [5, 10],
      ],
    });
    const bVals = [...df.col("b").values];
    expect(bVals[0]).toBeNull();
    expect(bVals[1]).toBe(3);
  });

  it("treats 'NA' as null", () => {
    const text = "val\n1\nNA\n3";
    const df = readFwf(text);
    expect([...df.col("val").values]).toEqual([1, null, 3]);
  });

  it("treats custom na value as null", () => {
    const text = "val\n1\n-999\n3";
    const df = readFwf(text, { naValues: ["-999"] });
    expect([...df.col("val").values]).toEqual([1, null, 3]);
  });
});

// ─── indexCol ────────────────────────────────────────────────────────────────

describe("readFwf — indexCol", () => {
  it("sets a column as the row index (by name)", () => {
    const text = "id   val\n1    100\n2    200";
    const df = readFwf(text, { indexCol: "id" });
    expect([...df.columns.values]).toEqual(["val"]);
    expect([...df.index.values]).toEqual([1, 2]);
  });

  it("sets a column as the row index (by position)", () => {
    const text = "id   val\n1    100\n2    200";
    const df = readFwf(text, { indexCol: 0 });
    expect([...df.columns.values]).toEqual(["val"]);
    expect([...df.index.values]).toEqual([1, 2]);
  });
});

// ─── empty input ──────────────────────────────────────────────────────────────

describe("readFwf — edge cases", () => {
  it("returns empty DataFrame for header-only input", () => {
    const text = "Name  Age";
    const df = readFwf(text);
    expect(df.shape[0]).toBe(0);
    expect([...df.columns.values]).toEqual(["Name", "Age"]);
  });

  it("returns empty DataFrame for empty string", () => {
    const df = readFwf("");
    expect(df.shape[0]).toBe(0);
  });

  it("handles Windows line endings (CRLF)", () => {
    const text = "x\r\n10\r\n20";
    const df = readFwf(text);
    expect([...df.col("x").values]).toEqual([10, 20]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("readFwf — property tests", () => {
  it("widths sum matches total line width", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 5 }),
        (widths) => {
          const total = widths.reduce((a, b) => a + b, 0);
          // Build header and one data row of exactly that width.
          const header = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, widths.length).split("").join(" ".repeat(Math.max(0, Math.floor(total / widths.length) - 1)));
          const row = "1".repeat(total);
          const text = header.padEnd(total, " ") + "\n" + row;
          const df = readFwf(text, { widths });
          expect(df.shape[0]).toBe(1);
          expect(df.shape[1]).toBe(widths.length);
        },
      ),
    );
  });

  it("colspecs round-trips: field count matches names count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 4 }),
        (widths) => {
          const names = widths.map((_, i) => `col${i}`);
          const total = widths.reduce((a, b) => a + b, 0);
          const dataRow = "0".repeat(total);
          const text = dataRow;
          const df = readFwf(text, {
            widths,
            header: null,
            names,
          });
          expect(df.shape[1]).toBe(names.length);
        },
      ),
    );
  });

  it("nRows limits output row count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        (totalRows, limit) => {
          const rows = ["val"];
          for (let i = 0; i < totalRows; i++) {
            rows.push(String(i));
          }
          const df = readFwf(rows.join("\n"), { nRows: limit });
          expect(df.shape[0]).toBe(Math.min(totalRows, limit));
        },
      ),
    );
  });
});
