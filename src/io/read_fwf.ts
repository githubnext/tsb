/**
 * read_fwf — fixed-width format file reader.
 *
 * Mirrors `pandas.read_fwf`: parses text files (or in-memory strings) where
 * columns occupy fixed character positions.  Column boundaries can be supplied
 * explicitly via `colspecs` or `widths`, or inferred automatically by scanning
 * the first `inferNrows` lines for whitespace-only columns.
 *
 * @example
 * ```ts
 * import { readFwf } from "tsb";
 *
 * const text = [
 *   "Name         Age  City",
 *   "Alice Liddell  30  New York",
 *   "Bob Marley     25  LA",
 * ].join("\n");
 *
 * const df = readFwf(text);
 * df.col("Age").values; // [30, 25]
 * ```
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** Start/end (exclusive) character positions for one column. */
export type ColSpec = [number, number];

/** Options for {@link readFwf}. */
export interface ReadFwfOptions {
  /**
   * List of `[start, end]` character positions (end is exclusive).
   * Pass `"infer"` (or omit entirely) to auto-detect column boundaries from
   * whitespace patterns in the first `inferNrows` lines.
   */
  colspecs?: ColSpec[] | "infer";
  /**
   * Column widths (alternative to `colspecs`).
   * `[10, 5, 8]` means the first column spans chars 0–9, the next 10–14, etc.
   */
  widths?: number[];
  /**
   * 0-based index of the row to use as column header.
   * Pass `null` for headerless files (auto-generates names `col0`, `col1`, …).
   * Default: `0`.
   */
  header?: number | null;
  /**
   * Override column names.  When `names` is provided the header row (if any)
   * is still consumed but its values are discarded.
   */
  names?: string[];
  /** Number of leading rows to skip before parsing. Default `0`. */
  skiprows?: number;
  /** Maximum number of data rows to read. Default `null` (all rows). */
  nrows?: number | null;
  /**
   * Additional strings to treat as missing (NA) values.
   * The built-in set already covers `""`, `"NA"`, `"N/A"`, `"NaN"`, `"null"`,
   * `"NULL"`, `"None"`, `"#N/A"`, `"#NA"`.
   */
  naValues?: string[];
  /**
   * Number of lines to inspect when inferring column boundaries.
   * Default `100`.
   */
  inferNrows?: number;
}

// ─── constants ────────────────────────────────────────────────────────────────

const BUILTIN_NA: ReadonlySet<string> = new Set([
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

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert a raw cell string to a typed Scalar. */
function parseCell(raw: string, extraNa: ReadonlySet<string>): Scalar {
  const t = raw.trim();
  if (BUILTIN_NA.has(t) || extraNa.has(t)) {
    return null;
  }
  if (t === "true") {
    return true;
  }
  if (t === "false") {
    return false;
  }
  const n = Number(t);
  if (t !== "" && !Number.isNaN(n)) {
    return n;
  }
  return t;
}

/** Build colspecs from an array of column widths. */
function widthsToColspecs(widths: number[]): ColSpec[] {
  const specs: ColSpec[] = [];
  let pos = 0;
  for (const w of widths) {
    specs.push([pos, pos + w]);
    pos += w;
  }
  return specs;
}

/** Extract a cell string from a line given character positions. */
function extractCell(line: string, start: number, end: number): string {
  return line.slice(start, end);
}

/** Auto-generate column names col0, col1, … */
function autoNames(n: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < n; i++) {
    names.push(`col${i}`);
  }
  return names;
}

/** Compute max line length in `sample`. */
function maxLineLen(sample: string[]): number {
  let max = 0;
  for (const l of sample) {
    if (l.length > max) {
      max = l.length;
    }
  }
  return max;
}

/** Build a boolean array where `true` means every sample line has a space at that position. */
function computeBreakPositions(sample: string[], maxLen: number): boolean[] {
  const isBreak: boolean[] = new Array(maxLen).fill(true) as boolean[];
  for (const l of sample) {
    for (let i = 0; i < l.length; i++) {
      if (l[i] !== " ") {
        isBreak[i] = false;
      }
    }
  }
  return isBreak;
}

/** Group contiguous non-break positions into ColSpec pairs. */
function groupToColspecs(isBreak: boolean[], maxLen: number): ColSpec[] {
  const specs: ColSpec[] = [];
  let inCol = false;
  let colStart = 0;
  for (let i = 0; i < maxLen; i++) {
    const atBreak = isBreak[i] ?? true;
    if (!(atBreak || inCol)) {
      colStart = i;
      inCol = true;
    } else if (atBreak && inCol) {
      specs.push([colStart, i]);
      inCol = false;
    }
  }
  if (inCol) {
    specs.push([colStart, maxLen]);
  }
  return specs;
}

/**
 * Infer colspecs by finding character positions that are whitespace in every
 * sample line, then grouping contiguous non-whitespace spans into columns.
 */
function inferColspecs(lines: readonly string[], nRows: number): ColSpec[] {
  const sample = lines.slice(0, nRows).filter((l) => l.length > 0);
  if (sample.length === 0) {
    return [];
  }
  const mLen = maxLineLen(sample);
  return groupToColspecs(computeBreakPositions(sample, mLen), mLen);
}

/** Resolve which colspecs to use given the options and the available lines. */
function resolveColspecs(
  opts: ReadFwfOptions,
  lines: readonly string[],
  headerRow: number | null,
  inferNrows: number,
): ColSpec[] {
  if (opts.widths !== undefined && opts.widths.length > 0) {
    return widthsToColspecs(opts.widths);
  }
  if (opts.colspecs !== undefined && opts.colspecs !== "infer") {
    return opts.colspecs;
  }
  const sampleStart = headerRow !== null ? headerRow : 0;
  return inferColspecs(lines.slice(sampleStart), inferNrows);
}

/** Resolve column names and the line index where data rows begin. */
function resolveColNames(
  colspecs: ColSpec[],
  lines: readonly string[],
  headerRow: number | null,
  nameOverride: string[] | undefined,
): { colNames: string[]; dataStart: number } {
  let colNames: string[];
  let dataStart: number;
  if (headerRow !== null) {
    const hLine = lines[headerRow] ?? "";
    colNames = colspecs.map(([s, e]) => extractCell(hLine, s, e).trim());
    dataStart = headerRow + 1;
  } else {
    colNames = autoNames(colspecs.length);
    dataStart = 0;
  }
  if (nameOverride !== undefined) {
    for (let i = 0; i < nameOverride.length && i < colNames.length; i++) {
      colNames[i] = nameOverride[i] ?? colNames[i] ?? "";
    }
  }
  return { colNames, dataStart };
}

/** Build column data arrays from data lines. */
function buildColumnData(
  limitedLines: readonly string[],
  colspecs: ColSpec[],
  colNames: string[],
  extraNa: ReadonlySet<string>,
): Record<string, Scalar[]> {
  const colArrays: Scalar[][] = colspecs.map(() => []);
  for (const line of limitedLines) {
    for (let ci = 0; ci < colspecs.length; ci++) {
      const spec = colspecs[ci];
      const arr = colArrays[ci];
      if (spec !== undefined && arr !== undefined) {
        arr.push(parseCell(extractCell(line, spec[0], spec[1]), extraNa));
      }
    }
  }
  const columns: Record<string, Scalar[]> = {};
  for (let ci = 0; ci < colNames.length; ci++) {
    const name = colNames[ci];
    const arr = colArrays[ci];
    if (name !== undefined && arr !== undefined) {
      columns[name] = arr;
    }
  }
  return columns;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Parse a fixed-width formatted text string into a DataFrame.
 *
 * Column boundaries are determined in priority order:
 * 1. `options.widths` — explicit widths array.
 * 2. `options.colspecs` (when not `"infer"`) — explicit `[start, end]` pairs.
 * 3. Auto-inferred from whitespace patterns (default when neither is provided).
 *
 * @param content - The text content to parse (newline-delimited rows).
 * @param options - Parsing options.
 * @returns A DataFrame whose columns correspond to the fixed-width fields.
 *
 * @example
 * ```ts
 * const text = "col1 col2\n   1    2\n   3    4";
 * const df = readFwf(text, { colspecs: [[0, 5], [5, 10]] });
 * df.columns; // ["col1", "col2"]
 * ```
 */
export function readFwf(content: string, options?: ReadFwfOptions): DataFrame {
  const opts = options ?? {};
  const skipRows = opts.skiprows ?? 0;
  const nRows = opts.nrows ?? null;
  const headerRow = opts.header !== undefined ? opts.header : 0;
  const inferNrows = opts.inferNrows ?? 100;
  const extraNa: ReadonlySet<string> = new Set(opts.naValues ?? []);

  const allLines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines = allLines.slice(skipRows);

  const colspecs = resolveColspecs(opts, lines, headerRow, inferNrows);
  if (colspecs.length === 0) {
    return DataFrame.fromColumns({});
  }

  const { colNames, dataStart } = resolveColNames(colspecs, lines, headerRow, opts.names);
  const dataLines = lines.slice(dataStart).filter((l) => l.trim() !== "");
  const limitedLines = nRows !== null ? dataLines.slice(0, nRows) : dataLines;

  return DataFrame.fromColumns(buildColumnData(limitedLines, colspecs, colNames, extraNa));
}
