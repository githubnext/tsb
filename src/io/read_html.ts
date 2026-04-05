/**
 * read_html — extract HTML tables from a string and return them as DataFrames.
 *
 * Mirrors `pandas.read_html`: scans a string for `<table>` elements, parses
 * their header (`<th>`) and data (`<td>`) cells, and returns one DataFrame per
 * table found.  A `match` filter (substring or regex) can restrict which tables
 * are returned.
 *
 * **Limitations compared to pandas:**
 * - No network I/O; caller must pass HTML as a string.
 * - `colspan` / `rowspan` attributes are not supported (cells are treated as
 *   single-occupancy).
 * - Nested tables inside a table cell are ignored.
 * - JavaScript-rendered content is not executed.
 *
 * @example
 * ```ts
 * import { readHtml } from "tsb";
 *
 * const html = `
 *   <table>
 *     <tr><th>Name</th><th>Age</th></tr>
 *     <tr><td>Alice</td><td>30</td></tr>
 *     <tr><td>Bob</td><td>25</td></tr>
 *   </table>`;
 *
 * const [df] = readHtml(html);
 * df.col("Age").values; // [30, 25]
 * ```
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** Options for {@link readHtml}. */
export interface ReadHtmlOptions {
  /**
   * String or RegExp that must be present inside a table (in its text content)
   * for that table to be included.  Default: include all tables.
   */
  match?: string | RegExp;
  /**
   * 0-based row index to use as the column header.  Default `0`.
   * Pass `null` for headerless tables (auto-names `col0`, `col1`, …).
   */
  header?: number | null;
  /** Number of leading data rows to skip (after the header). Default `0`. */
  skiprows?: number;
  /** Maximum number of data rows to include. Default `null` (all). */
  nrows?: number | null;
  /**
   * Additional strings to treat as NA.
   * Built-in NA strings: `""`, `"NA"`, `"N/A"`, `"NaN"`, `"null"`, `"NULL"`,
   * `"None"`, `"#N/A"`, `"#NA"`.
   */
  naValues?: string[];
}

// ─── constants ────────────────────────────────────────────────────────────────

const BUILTIN_NA_HTML: ReadonlySet<string> = new Set([
  "",
  "NA",
  "N/A",
  "NaN",
  "null",
  "NULL",
  "None",
  "#N/A",
  "#NA",
]);

// ─── top-level regex patterns ─────────────────────────────────────────────────

/** Matches a complete `<table …>…</table>` block (non-greedy, dotAll). */
const RE_TABLE = /<table[^>]*>([\s\S]*?)<\/table>/gi;

/** Matches a `<tr …>…</tr>` row block (non-greedy). */
const RE_ROW = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

/** Matches a `<th …>` or `<td …>` cell element (non-greedy). */
const RE_CELL = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

/** Matches any HTML tag. */
const RE_TAG = /<[^>]+>/g;

/** Matches runs of whitespace. */
const RE_WS = /\s+/g;

/** HTML entity map for common entities. */
const HTML_ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&#160;": " ",
  "&apos;": "'",
};

/** Numeric HTML entity pattern (decimal or hex). */
const RE_NUM_ENTITY = /&#(x[0-9a-fA-F]+|[0-9]+);/g;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML tags and decode common entities from a cell's inner HTML. */
function cellText(html: string): string {
  let s = html.replace(RE_TAG, "");
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    s = s.split(entity).join(char);
  }
  s = s.replace(RE_NUM_ENTITY, (_, code: string) => {
    const n = code.startsWith("x") ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10);
    return Number.isNaN(n) ? "" : String.fromCodePoint(n);
  });
  return s.replace(RE_WS, " ").trim();
}

/** Convert a cell text to a typed Scalar. */
function parseHtmlCell(text: string, extraNa: ReadonlySet<string>): Scalar {
  if (BUILTIN_NA_HTML.has(text) || extraNa.has(text)) {
    return null;
  }
  if (text === "true") {
    return true;
  }
  if (text === "false") {
    return false;
  }
  const n = Number(text);
  if (text !== "" && !Number.isNaN(n)) {
    return n;
  }
  return text;
}

/** Extract all `<tr>` row strings from table inner HTML. */
function extractRows(tableHtml: string): string[] {
  const rows: string[] = [];
  // Reset lastIndex before iterating
  RE_ROW.lastIndex = 0;
  let m = RE_ROW.exec(tableHtml);
  while (m !== null) {
    rows.push(m[0] ?? "");
    m = RE_ROW.exec(tableHtml);
  }
  return rows;
}

/** Extract all cell text values from a `<tr>` row string. */
function extractCells(rowHtml: string): string[] {
  const cells: string[] = [];
  RE_CELL.lastIndex = 0;
  let m = RE_CELL.exec(rowHtml);
  while (m !== null) {
    cells.push(cellText(m[1] ?? ""));
    m = RE_CELL.exec(rowHtml);
  }
  return cells;
}

/** Auto-generate column names col0, col1, … up to length n. */
function autoColNames(n: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < n; i++) {
    names.push(`col${i}`);
  }
  return names;
}

/** Resolve column names and the row index where data starts. */
function resolveHeader(
  allRows: string[],
  headerIndex: number | null,
): { colNames: string[]; dataRowStart: number } {
  if (headerIndex !== null && headerIndex < allRows.length) {
    return {
      colNames: extractCells(allRows[headerIndex] ?? ""),
      dataRowStart: headerIndex + 1,
    };
  }
  return {
    colNames: autoColNames(extractCells(allRows[0] ?? "").length),
    dataRowStart: 0,
  };
}

/** Slice data rows applying skiprows and nrows options. */
function sliceDataRows(
  allRows: string[],
  dataRowStart: number,
  skiprows: number,
  nrows: number | null,
): string[] {
  let rows = allRows.slice(dataRowStart);
  if (skiprows > 0) {
    rows = rows.slice(skiprows);
  }
  if (nrows !== null) {
    rows = rows.slice(0, nrows);
  }
  return rows;
}

/** Build column arrays from data rows. */
function buildColArrays(
  dataRows: string[],
  colNames: string[],
  extraNa: ReadonlySet<string>,
): Record<string, Scalar[]> {
  const nCols = colNames.length;
  const colArrays: Scalar[][] = colNames.map(() => []);
  for (const row of dataRows) {
    const cells = extractCells(row);
    for (let ci = 0; ci < nCols; ci++) {
      const text = cells[ci] ?? "";
      const arr = colArrays[ci];
      if (arr !== undefined) {
        arr.push(parseHtmlCell(text, extraNa));
      }
    }
  }
  const record: Record<string, Scalar[]> = {};
  for (let ci = 0; ci < nCols; ci++) {
    const name = colNames[ci];
    const arr = colArrays[ci];
    if (name !== undefined && arr !== undefined) {
      record[name] = arr;
    }
  }
  return record;
}

/** Parse one table inner-HTML string into a DataFrame. */
function parseTable(tableHtml: string, opts: Required<ReadHtmlOptions>): DataFrame {
  const allRows = extractRows(tableHtml);
  if (allRows.length === 0) {
    return DataFrame.fromColumns({});
  }
  const { colNames, dataRowStart } = resolveHeader(allRows, opts.header);
  if (colNames.length === 0) {
    return DataFrame.fromColumns({});
  }
  const extraNa: ReadonlySet<string> = new Set(opts.naValues);
  const dataRows = sliceDataRows(allRows, dataRowStart, opts.skiprows, opts.nrows);
  return DataFrame.fromColumns(buildColArrays(dataRows, colNames, extraNa));
}

/** Check whether table inner HTML contains a match string or regex. */
function tableMatches(tableHtml: string, match: string | RegExp): boolean {
  const text = tableHtml.replace(RE_TAG, " ").replace(RE_WS, " ");
  if (typeof match === "string") {
    return text.includes(match);
  }
  match.lastIndex = 0;
  return match.test(text);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Parse all HTML tables from a string and return one DataFrame per table.
 *
 * @param content - Raw HTML string.
 * @param options - Parsing options.
 * @returns Array of DataFrames, one per matched `<table>` element.
 *
 * @example
 * ```ts
 * const html = "<table><tr><th>x</th></tr><tr><td>42</td></tr></table>";
 * const [df] = readHtml(html);
 * df.col("x").values; // [42]
 * ```
 */
export function readHtml(content: string, options?: ReadHtmlOptions): DataFrame[] {
  const opts: Required<ReadHtmlOptions> = {
    match: options?.match ?? "",
    header: options?.header !== undefined ? options.header : 0,
    skiprows: options?.skiprows ?? 0,
    nrows: options?.nrows ?? null,
    naValues: options?.naValues ?? [],
  };

  const results: DataFrame[] = [];
  RE_TABLE.lastIndex = 0;
  let m = RE_TABLE.exec(content);
  while (m !== null) {
    const tableInner = m[1] ?? "";
    const shouldInclude =
      opts.match === "" || (opts.match !== "" && tableMatches(tableInner, opts.match));
    if (shouldInclude) {
      results.push(parseTable(tableInner, opts));
    }
    m = RE_TABLE.exec(content);
  }
  return results;
}
