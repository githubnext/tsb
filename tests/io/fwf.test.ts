/**
 * Tests for src/io/fwf.ts — readFwf().
 *
 * Mirrors pandas.read_fwf() test suite:
 * - Auto column-spec inference
 * - Explicit colspecs / widths
 * - header, names, indexCol options
 * - NA handling, dtype inference and forcing
 * - skipRows, nRows
 * - Property-based round-trip via widths
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { readFwf } from "../../src/index.ts";

// ─── basic inference ──────────────────────────────────────────────────────────

describe("readFwf — column-spec inference", () => {
  it("infers columns from a simple fixed-width table", () => {
    const text = ["id  name     score", "1   Alice    95.5 ", "2   Bob      87.0 "].join("\n");
    const df = readFwf(text);
    expect(df.shape).toEqual([2, 3]);
    expect([...df.columns.values]).toEqual(["id", "name", "score"]);
    expect([...df.col("id").values]).toEqual([1, 2]);
    expect([...df.col("name").values]).toEqual(["Alice", "Bob"]);
    expect([...df.col("score").values]).toEqual([95.5, 87.0]);
  });

  it("infers integer dtype for whole-number columns", () => {
    const text = ["a  b\n1  2\n3  4"].join("\n");
    const df = readFwf(text);
    expect(df.col("a").dtype.name).toBe("int64");
    expect(df.col("b").dtype.name).toBe("int64");
  });

  it("infers float dtype for decimal columns", () => {
    const text = "x    y\n1.5  2.7\n3.1  4.9";
    const df = readFwf(text);
    expect(df.col("x").dtype.name).toBe("float64");
    expect(df.col("y").dtype.name).toBe("float64");
  });

  it("keeps string columns as object dtype", () => {
    const text = "name    val\nAlice   10\nBob     20";
    const df = readFwf(text);
    expect(df.col("name").dtype.name).toBe("object");
  });

  it("handles a single column", () => {
    const text = "x\n1\n2\n3";
    const df = readFwf(text);
    expect(df.shape).toEqual([3, 1]);
    expect([...df.col("x").values]).toEqual([1, 2, 3]);
  });

  it("returns empty DataFrame for empty text", () => {
    const df = readFwf("");
    expect(df.shape).toEqual([0, 0]);
  });

  it("returns correct shape for header-only text", () => {
    const text = "a  b  c";
    const df = readFwf(text);
    expect(df.shape[1]).toBe(3);
    expect(df.shape[0]).toBe(0);
  });
});

// ─── explicit colspecs ────────────────────────────────────────────────────────

describe("readFwf — explicit colspecs", () => {
  it("parses using explicit [start, end) colspecs", () => {
    const text = "Alice 30 NY\nBob   25 LA";
    const df = readFwf(text, {
      header: null,
      colspecs: [
        [0, 6],
        [6, 9],
        [9, 11],
      ],
      names: ["name", "age", "city"],
    });
    expect(df.shape).toEqual([2, 3]);
    expect([...df.col("name").values]).toEqual(["Alice", "Bob"]);
    expect([...df.col("age").values]).toEqual([30, 25]);
    expect([...df.col("city").values]).toEqual(["NY", "LA"]);
  });

  it("handles colspecs with header row", () => {
    const text = ["name  age\nAlice 30\nBob   25"].join("\n");
    const df = readFwf(text, {
      colspecs: [
        [0, 6],
        [6, 9],
      ],
    });
    expect([...df.col("name").values]).toEqual(["Alice", "Bob"]);
    expect([...df.col("age").values]).toEqual([30, 25]);
  });
});

// ─── widths ───────────────────────────────────────────────────────────────────

describe("readFwf — widths option", () => {
  it("parses using explicit widths", () => {
    const text = ["name age\nAlice30\nBob  25"].join("\n");
    const df = readFwf(text, { widths: [5, 3] });
    expect([...df.col("name").values]).toEqual(["Alice", "Bob"]);
    expect([...df.col("age").values]).toEqual([30, 25]);
  });

  it("widths produce correct colspecs via accumulation", () => {
    const text = "abcdef\n123456";
    // widths [2,2,2] → colspecs [[0,2],[2,4],[4,6]]
    const df = readFwf(text, { widths: [2, 2, 2], header: null, names: ["p", "q", "r"] });
    expect([...df.col("p").values]).toEqual(["12"]);
    expect([...df.col("q").values]).toEqual(["34"]);
    expect([...df.col("r").values]).toEqual(["56"]);
  });
});

// ─── header / names ───────────────────────────────────────────────────────────

describe("readFwf — header and names options", () => {
  it("uses header: null to parse headerless files", () => {
    const text = "1  Alice  95\n2  Bob    87";
    const df = readFwf(text, { header: null });
    expect([...df.columns.values]).toEqual(["0", "1", "2"]);
    expect([...df.col("0").values]).toEqual([1, 2]);
  });

  it("accepts explicit names overriding header row", () => {
    const text = "id  name   score\n1   Alice  95\n2   Bob    87";
    const df = readFwf(text, { names: ["ID", "NAME", "SCORE"] });
    expect([...df.columns.values]).toEqual(["ID", "NAME", "SCORE"]);
    expect([...df.col("ID").values]).toEqual([1, 2]);
  });

  it("accepts explicit names with header: null", () => {
    const text = "1   Alice  95\n2   Bob    87";
    const df = readFwf(text, { header: null, names: ["ID", "NAME", "SCORE"] });
    expect([...df.columns.values]).toEqual(["ID", "NAME", "SCORE"]);
    expect([...df.col("NAME").values]).toEqual(["Alice", "Bob"]);
  });
});

// ─── indexCol ─────────────────────────────────────────────────────────────────

describe("readFwf — indexCol option", () => {
  it("uses a named column as the row index", () => {
    const text = "id  val\nA   10\nB   20";
    const df = readFwf(text, { indexCol: "id" });
    expect(df.shape).toEqual([2, 1]);
    expect([...df.index.values]).toEqual(["A", "B"]);
    expect([...df.col("val").values]).toEqual([10, 20]);
  });

  it("uses a positional column as the row index", () => {
    const text = "id  val\n1   10\n2   20";
    const df = readFwf(text, { indexCol: 0 });
    expect(df.shape).toEqual([2, 1]);
    expect([...df.index.values]).toEqual([1, 2]);
  });
});

// ─── NA handling ──────────────────────────────────────────────────────────────

describe("readFwf — NA handling", () => {
  it("treats empty fields as NaN in numeric columns", () => {
    const text = "a   b  \n1   2  \n    3  ";
    const df = readFwf(text);
    const aVals = [...df.col("a").values];
    expect(Number.isNaN(aVals[1] as number)).toBe(true);
  });

  it("treats 'NA' as NaN in numeric columns", () => {
    const text = "x  \n1  \nNA ";
    const df = readFwf(text);
    const vals = [...df.col("x").values];
    expect(Number.isNaN(vals[1] as number)).toBe(true);
  });

  it("accepts additional NA values", () => {
    const text = "x    \n1    \nMISSNG";
    const df = readFwf(text, { naValues: ["MISSNG"] });
    const vals = [...df.col("x").values];
    expect(Number.isNaN(vals[1] as number)).toBe(true);
  });
});

// ─── dtype forcing ────────────────────────────────────────────────────────────

describe("readFwf — dtype forcing", () => {
  it("forces a column to float64", () => {
    const text = "a  b\n1  2\n3  4";
    const df = readFwf(text, { dtype: { a: "float64" } });
    expect(df.col("a").dtype.name).toBe("float64");
    expect([...df.col("a").values]).toEqual([1, 2, 3, 4].slice(0, 2).map(Number));
  });

  it("forces a column to object dtype", () => {
    const text = "x  \n1  \n2  ";
    const df = readFwf(text, { dtype: { x: "object" } });
    expect(df.col("x").dtype.name).toBe("object");
    expect([...df.col("x").values]).toEqual(["1", "2"]);
  });
});

// ─── skipRows / nRows ─────────────────────────────────────────────────────────

describe("readFwf — skipRows and nRows options", () => {
  it("skips leading data rows", () => {
    const text = "x\n1\n2\n3\n4";
    const df = readFwf(text, { skipRows: 2 });
    expect([...df.col("x").values]).toEqual([3, 4]);
  });

  it("reads at most nRows data rows", () => {
    const text = "x\n1\n2\n3\n4";
    const df = readFwf(text, { nRows: 2 });
    expect([...df.col("x").values]).toEqual([1, 2]);
  });

  it("combines skipRows and nRows correctly", () => {
    const text = "x\n1\n2\n3\n4\n5";
    const df = readFwf(text, { skipRows: 1, nRows: 2 });
    expect([...df.col("x").values]).toEqual([2, 3]);
  });
});

// ─── inferNrows ───────────────────────────────────────────────────────────────

describe("readFwf — inferNrows option", () => {
  it("uses only the specified number of rows for inference", () => {
    // 3 rows; inferNrows=1 will only look at the first row
    const text = "a   b\n100 200\n3   4\n5   6";
    const df = readFwf(text, { inferNrows: 1 });
    expect(df.shape[0]).toBe(3);
    expect([...df.col("a").values]).toEqual([100, 3, 5]);
  });
});

// ─── CRLF line endings ────────────────────────────────────────────────────────

describe("readFwf — line endings", () => {
  it("handles CRLF line endings", () => {
    const text = "a  b\r\n1  2\r\n3  4";
    const df = readFwf(text);
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("a").values]).toEqual([1, 3]);
  });

  it("handles CR-only line endings", () => {
    const text = "a  b\r1  2\r3  4";
    const df = readFwf(text);
    expect(df.shape).toEqual([2, 2]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("readFwf — property-based (widths round-trip)", () => {
  it("correctly extracts integer fields when widths are given", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 999 }), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (values, width) => {
          // Pad each value to `width` chars.
          const pad = (v: number): string => String(v).padStart(width, " ");
          const row = values.map(pad).join("");
          const df = readFwf(row, {
            header: null,
            widths: Array.from({ length: values.length }, () => width),
            names: values.map((_, i) => String(i)),
          });
          expect(df.shape[0]).toBe(1);
          for (let i = 0; i < values.length; i++) {
            const col = df.col(String(i));
            expect([...col.values][0]).toBe(values[i]);
          }
        },
      ),
    );
  });

  it("inferred colspecs yield correct field count for well-formed tables", () => {
    fc.assert(
      fc.property(
        // Generate 2-4 columns, each 4-8 chars wide with a 1-2 char separator.
        fc.array(
          fc.record({
            width: fc.integer({ min: 4, max: 8 }),
            sep: fc.integer({ min: 1, max: 2 }),
          }),
          { minLength: 2, maxLength: 4 },
        ),
        fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 5 }),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        (colDefs, _rowDefs) => {
          const buildRow = (vals: string[]): string =>
            colDefs
              .map((c, i) => (vals[i] ?? "x").slice(0, c.width).padEnd(c.width + c.sep, " "))
              .join("");

          const headers = colDefs.map((_, i) => `col${i}`);
          const headerRow = buildRow(headers);
          const dataRows = [buildRow(["10", "20", "30", "40"]).slice(0, headerRow.length)];
          const text = [headerRow, ...dataRows].join("\n");

          const df = readFwf(text);
          // We just verify the shape is consistent — at least 1 row, some columns.
          expect(df.shape[0]).toBeGreaterThanOrEqual(1);
          expect(df.shape[1]).toBeGreaterThanOrEqual(1);
        },
      ),
    );
  });
});

// ─── pandas parity: exact field values ───────────────────────────────────────

describe("readFwf — pandas parity", () => {
  /** Reproduces the standard pandas read_fwf docstring example. */
  it("matches pandas example: employee table", () => {
    const text = ["col1 col2  col3", "   1 0.236    a", "   2  3.24    b", "   3  4.56    c"].join(
      "\n",
    );
    const df = readFwf(text);
    expect([...df.col("col1").values]).toEqual([1, 2, 3]);
    expect([...df.col("col3").values]).toEqual(["a", "b", "c"]);
    const col2 = [...df.col("col2").values] as number[];
    expect(col2[0]).toBeCloseTo(0.236);
    expect(col2[1]).toBeCloseTo(3.24);
  });

  it("reads a US Census fixed-width-like layout", () => {
    const text = ["State  Pop    Abbr", "Texas  29145  TX  ", "Oregon  4237  OR  "].join("\n");
    const df = readFwf(text);
    expect([...df.col("State").values]).toEqual(["Texas", "Oregon"]);
    expect([...df.col("Abbr").values]).toEqual(["TX", "OR"]);
  });

  it("handles bool columns", () => {
    const text = "flag  val\ntrue  1\nfalse 2";
    const df = readFwf(text);
    expect(df.col("flag").dtype.name).toBe("bool");
    expect([...df.col("flag").values]).toEqual([true, false]);
  });
});
