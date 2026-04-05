/**
 * Tests for read_html — HTML table parser.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { readHtml } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const RE_ALPHA = /alpha/i;

function table(rows: string[]): string {
  return `<table>${rows.join("")}</table>`;
}

function row(cells: string[], isHeader = false): string {
  const tag = isHeader ? "th" : "td";
  return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
}

// ─── basic table parsing ──────────────────────────────────────────────────────

describe("readHtml — basic table", () => {
  it("parses a simple table with header row", () => {
    const html = table([row(["Name", "Age"], true), row(["Alice", "30"]), row(["Bob", "25"])]);
    const [df] = readHtml(html);
    expect(df).toBeDefined();
    expect(df?.columns).toContain("Name");
    expect(df?.columns).toContain("Age");
    expect(df?.shape[0]).toBe(2);
  });

  it("parses numeric cell values as numbers", () => {
    const html = table([row(["x", "y"], true), row(["1", "2"]), row(["3.14", "2.72"])]);
    const [df] = readHtml(html);
    expect(df?.col("x").values[0]).toBe(1);
    expect(df?.col("y").values[0]).toBe(2);
    expect(df?.col("x").values[1]).toBeCloseTo(3.14);
  });

  it("parses boolean cell values", () => {
    const html = table([row(["flag"], true), row(["true"]), row(["false"])]);
    const [df] = readHtml(html);
    expect(df?.col("flag").values[0]).toBe(true);
    expect(df?.col("flag").values[1]).toBe(false);
  });
});

// ─── multiple tables ──────────────────────────────────────────────────────────

describe("readHtml — multiple tables", () => {
  it("returns one DataFrame per table", () => {
    const html =
      table([row(["A"], true), row(["1"])]) + table([row(["B", "C"], true), row(["2", "3"])]);
    const dfs = readHtml(html);
    expect(dfs.length).toBe(2);
    expect(dfs[0]?.columns).toContain("A");
    expect(dfs[1]?.columns).toContain("B");
  });

  it("returns empty array when no tables found", () => {
    expect(readHtml("<p>no tables here</p>")).toEqual([]);
  });
});

// ─── header=null ──────────────────────────────────────────────────────────────

describe("readHtml — header=null", () => {
  it("uses auto-generated column names", () => {
    const html = table([row(["Alice", "30"]), row(["Bob", "25"])]);
    const [df] = readHtml(html, { header: null });
    expect(df?.columns.values[0]).toBe("col0");
    expect(df?.columns.values[1]).toBe("col1");
    expect(df?.shape[0]).toBe(2);
  });
});

// ─── match filter ─────────────────────────────────────────────────────────────

describe("readHtml — match filter", () => {
  it("string match keeps only tables containing the substring", () => {
    const html =
      table([row(["Person"], true), row(["Alice"])]) +
      table([row(["Product"], true), row(["Widget"])]);
    const dfs = readHtml(html, { match: "Person" });
    expect(dfs.length).toBe(1);
    expect(dfs[0]?.columns).toContain("Person");
  });

  it("regex match works", () => {
    const html =
      table([row(["A"], true), row(["alpha"])]) + table([row(["B"], true), row(["beta"])]);
    const dfs = readHtml(html, { match: RE_ALPHA });
    expect(dfs.length).toBe(1);
    expect(dfs[0]?.columns).toContain("A");
  });

  it("empty string match (default) includes all tables", () => {
    const html = table([row(["X"], true)]) + table([row(["Y"], true)]);
    const dfs = readHtml(html);
    expect(dfs.length).toBe(2);
  });
});

// ─── skiprows and nrows ───────────────────────────────────────────────────────

describe("readHtml — skiprows and nrows", () => {
  it("skiprows skips leading data rows", () => {
    const html = table([row(["v"], true), row(["1"]), row(["2"]), row(["3"])]);
    const [df] = readHtml(html, { skiprows: 1 });
    expect(df?.shape[0]).toBe(2);
    expect(df?.col("v").values[0]).toBe(2);
  });

  it("nrows limits data rows", () => {
    const html = table([row(["v"], true), row(["10"]), row(["20"]), row(["30"])]);
    const [df] = readHtml(html, { nrows: 2 });
    expect(df?.shape[0]).toBe(2);
    expect(df?.col("v").values[1]).toBe(20);
  });
});

// ─── NA values ────────────────────────────────────────────────────────────────

describe("readHtml — NA values", () => {
  it("parses built-in NA strings as null", () => {
    const html = table([row(["a"], true), row(["NA"]), row(["NaN"]), row([""])]);
    const [df] = readHtml(html);
    expect(df?.col("a").values[0]).toBeNull();
    expect(df?.col("a").values[1]).toBeNull();
    expect(df?.col("a").values[2]).toBeNull();
  });

  it("parses custom NA strings as null", () => {
    const html = table([row(["v"], true), row(["-"]), row(["n/a"])]);
    const [df] = readHtml(html, { naValues: ["-", "n/a"] });
    expect(df?.col("v").values[0]).toBeNull();
    expect(df?.col("v").values[1]).toBeNull();
  });
});

// ─── HTML entities and tags ───────────────────────────────────────────────────

describe("readHtml — HTML entities and nested tags", () => {
  it("decodes &amp; &lt; &gt; entities", () => {
    const html = table([row(["text"], true), row(["A &amp; B"]), row(["1 &lt; 2"])]);
    const [df] = readHtml(html);
    expect(df?.col("text").values[0]).toBe("A & B");
    expect(df?.col("text").values[1]).toBe("1 < 2");
  });

  it("strips inner HTML tags from cells", () => {
    const html = table([row(["name"], true), "<tr><td><strong>Alice</strong></td></tr>"]);
    const [df] = readHtml(html);
    expect(df?.col("name").values[0]).toBe("Alice");
  });

  it("decodes &nbsp; as space", () => {
    const html = table([row(["v"], true), row(["hello&nbsp;world"])]);
    const [df] = readHtml(html);
    expect(df?.col("v").values[0]).toBe("hello world");
  });
});

// ─── attribute-wrapped tables ─────────────────────────────────────────────────

describe("readHtml — tables with attributes", () => {
  it("parses tables with class/id attributes", () => {
    const html = `<table class="data" id="t1"><tr><th>x</th></tr><tr><td>42</td></tr></table>`;
    const [df] = readHtml(html);
    expect(df?.col("x").values[0]).toBe(42);
  });
});

// ─── case insensitivity ───────────────────────────────────────────────────────

describe("readHtml — case insensitive tags", () => {
  it("handles uppercase TABLE/TR/TH/TD tags", () => {
    const html = "<TABLE><TR><TH>A</TH><TH>B</TH></TR><TR><TD>1</TD><TD>2</TD></TR></TABLE>";
    const [df] = readHtml(html);
    expect(df?.shape).toEqual([1, 2]);
  });

  it("handles mixed-case tags", () => {
    const html = "<Table><tr><Th>X</Th></tr><tr><Td>99</Td></tr></Table>";
    const [df] = readHtml(html);
    expect(df?.col("X").values[0]).toBe(99);
  });
});

// ─── empty table ─────────────────────────────────────────────────────────────

describe("readHtml — empty table", () => {
  it("empty table returns empty DataFrame", () => {
    const html = "<table></table>";
    const [df] = readHtml(html);
    expect(df?.shape[0]).toBe(0);
  });

  it("table with only header returns empty data DataFrame", () => {
    const html = table([row(["A", "B"], true)]);
    const [df] = readHtml(html);
    expect(df?.shape[0]).toBe(0);
    expect(df?.columns).toContain("A");
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("readHtml — property tests", () => {
  it("number of DataFrames returned equals number of tables in HTML", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 8 }), (numTables) => {
        const tables = Array.from({ length: numTables }, (_, i) =>
          table([row([`col${i}`], true), row([String(i)])]),
        );
        const html = tables.join("\n");
        const dfs = readHtml(html);
        expect(dfs.length).toBe(numTables);
      }),
    );
  });

  it("all returned DataFrames have correct column count", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 5 }),
          { minLength: 1, maxLength: 5 },
        ),
        (tableHeaders) => {
          const tables = tableHeaders.map((headers) =>
            table([row(headers, true), row(headers.map((_, i) => String(i)))]),
          );
          const html = tables.join("");
          const dfs = readHtml(html);
          for (let i = 0; i < dfs.length; i++) {
            expect(dfs[i]?.columns.size).toBe(tableHeaders[i]?.length);
          }
        },
      ),
    );
  });
});
