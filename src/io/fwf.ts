/**
 * readFwf — read a fixed-width formatted text file into a DataFrame.
 *
 * Mirrors `pandas.read_fwf()`:
 * - Auto-infer column widths from whitespace patterns in sample rows.
 * - Explicit column specs via `colspecs` (pairs of [from, to]) or `widths`.
 * - Standard options: `header`, `names`, `indexCol`, `naValues`, `skipRows`, `nRows`.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import { Dtype } from "../core/index.ts";
import type { DtypeName, Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * A column spec is a half-open `[start, end)` pair of character indices
 * (0-based) within a line, mirroring pandas' `colspecs` parameter.
 */
export type ColSpec = readonly [number, number];

/** Options for {@link readFwf}. */
export interface ReadFwfOptions {
  /**
   * List of `[start, end)` character-index pairs for each column,
   * or `"infer"` to auto-detect from whitespace patterns.
   * Default: `"infer"`.
   */
  readonly colspecs?: readonly ColSpec[] | "infer";
  /**
   * Column widths as an alternative to `colspecs`.
   * Widths are summed to produce consecutive `[start, end)` spans.
   * Cannot be used together with `colspecs`.
   */
  readonly widths?: readonly number[];
  /**
   * Number of data rows to sample when inferring column widths.
   * Default: `100`.
   */
  readonly inferNrows?: number;
  /**
   * Row index of the header row, or `null` for no header.
   * Default: `0`.
   */
  readonly header?: number | null;
  /**
   * Explicit column names to use (overrides the inferred/parsed header row).
   * When provided alongside `header: 0`, the header row is still consumed but
   * the given names replace it — mirroring pandas behaviour.
   */
  readonly names?: readonly string[];
  /**
   * Column name or index to use as the row index.
   * Default: `null` (use a default RangeIndex).
   */
  readonly indexCol?: string | number | null;
  /**
   * Map of column name → dtype name to force a specific dtype for that column.
   */
  readonly dtype?: Readonly<Record<string, DtypeName>>;
  /**
   * Additional strings to treat as missing / NA (in addition to the built-in
   * defaults: `""`, `"null"`, `"NULL"`, `"NaN"`, `"NA"`, `"N/A"`, `"n/a"`,
   * `"#N/A"`, `"none"`, `"None"`, `"#NA"`).
   */
  readonly naValues?: readonly string[];
  /**
   * Number of data rows to skip after the header.
   * Default: `0`.
   */
  readonly skipRows?: number;
  /**
   * Maximum number of data rows to read.
   * Default: unlimited.
   */
  readonly nRows?: number;
}

// ─── constants ────────────────────────────────────────────────────────────────

const DEFAULT_NA_STRINGS: ReadonlySet<string> = new Set([
  "",
  "null",
  "NULL",
  "NaN",
  "NA",
  "N/A",
  "n/a",
  "#N/A",
  "none",
  "None",
  "#NA",
]);

// Top-level regex literals (Biome `useTopLevelRegex` rule).
const RE_LINE_SPLIT = /\r\n|\n|\r/;
const RE_INT = /^-?\d+$/;
const RE_FLOAT = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const RE_BOOL_TRUE = /^(true|True|TRUE)$/;
const RE_BOOL_FALSE = /^(false|False|FALSE)$/;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Split text into non-empty lines. */
function splitLines(text: string): string[] {
  return text.split(RE_LINE_SPLIT).filter((l) => l.length > 0);
}

/** Build the NA set from options. */
function buildNaSet(naValues: readonly string[] | undefined): Set<string> {
  const s: Set<string> = new Set(DEFAULT_NA_STRINGS);
  if (naValues !== undefined) {
    for (const v of naValues) {
      s.add(v);
    }
  }
  return s;
}

// ─── column spec inference ────────────────────────────────────────────────────

/**
 * Infer column boundaries from sample lines.
 *
 * A character position is a "separator position" if every sample row has a
 * space (or has no character at that position — i.e., the row is shorter).
 * Columns are the maximal runs of consecutive non-separator positions.
 */
function inferColspecs(sampleLines: readonly string[]): ColSpec[] {
  if (sampleLines.length === 0) {
    return [];
  }

  const maxLen = sampleLines.reduce((m, l) => Math.max(m, l.length), 0);
  if (maxLen === 0) {
    return [];
  }

  // isSep[i] = true when all sample rows have a space (or are shorter) at i.
  const isSep: boolean[] = Array.from({ length: maxLen }, () => true);
  for (const line of sampleLines) {
    for (let i = 0; i < maxLen; i++) {
      const ch = line.charAt(i); // "" when i >= line.length
      if (ch !== "" && ch !== " ") {
        isSep[i] = false;
      }
    }
  }

  // Collect [start, end) spans for each run of non-separator positions.
  const specs: ColSpec[] = [];
  let inCol = false;
  let colStart = 0;
  for (let i = 0; i < maxLen; i++) {
    const sep = isSep[i] ?? true;
    if (!(inCol || sep)) {
      inCol = true;
      colStart = i;
    } else if (inCol && sep) {
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
 * Convert a list of column widths into `[start, end)` colspecs.
 */
function widthsToColspecs(widths: readonly number[]): ColSpec[] {
  const specs: ColSpec[] = [];
  let pos = 0;
  for (const w of widths) {
    specs.push([pos, pos + w]);
    pos += w;
  }
  return specs;
}

// ─── field extraction ─────────────────────────────────────────────────────────

/**
 * Extract one field from a line given its `[start, end)` span.
 * Returns a trimmed string; returns `""` when the span is beyond the line.
 */
function extractField(line: string, start: number, end: number): string {
  return line.substring(start, end).trim();
}

/**
 * Extract all fields from a line according to colspecs.
 */
function extractFields(line: string, specs: readonly ColSpec[]): string[] {
  return specs.map(([s, e]) => extractField(line, s, e));
}

// ─── dtype inference ──────────────────────────────────────────────────────────

/** True when a raw string should be treated as missing. */
function isNaRaw(raw: string, naSet: ReadonlySet<string>): boolean {
  return naSet.has(raw);
}

/** Infer the most specific dtype for a column from its raw string values. */
function inferColumnDtype(raws: readonly string[], naSet: ReadonlySet<string>): DtypeName {
  const nonNa = raws.filter((r) => !isNaRaw(r, naSet));
  const hasNa = nonNa.length < raws.length;
  if (nonNa.length === 0) {
    return "object";
  }

  if (nonNa.every((r) => RE_BOOL_TRUE.test(r) || RE_BOOL_FALSE.test(r))) {
    return "bool";
  }
  if (nonNa.every((r) => RE_INT.test(r))) {
    return hasNa ? "float64" : "int64";
  }
  if (nonNa.every((r) => RE_FLOAT.test(r))) {
    return "float64";
  }
  return "object";
}

/** Parse a raw string to a Scalar for an inferred dtype. */
function parseInferred(raw: string, dtype: DtypeName, naSet: ReadonlySet<string>): Scalar {
  if (isNaRaw(raw, naSet)) {
    return dtype === "float64" || dtype === "int64" ? Number.NaN : null;
  }
  if (dtype === "bool") {
    return RE_BOOL_TRUE.test(raw);
  }
  if (dtype === "int64") {
    return Number.parseInt(raw, 10);
  }
  if (dtype === "float64") {
    return Number.parseFloat(raw);
  }
  return raw;
}

/** Parse a raw string to a Scalar when a specific dtype is forced. */
function parseForced(raw: string, dtypeName: DtypeName, naSet: ReadonlySet<string>): Scalar {
  if (isNaRaw(raw, naSet)) {
    return null;
  }
  if (dtypeName.startsWith("int") || dtypeName.startsWith("uint")) {
    const n = Number(raw);
    return Number.isNaN(n) ? null : Math.trunc(n);
  }
  if (dtypeName.startsWith("float")) {
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  if (dtypeName === "bool") {
    if (RE_BOOL_TRUE.test(raw)) {
      return true;
    }
    if (RE_BOOL_FALSE.test(raw)) {
      return false;
    }
    return null;
  }
  return raw;
}

/** Build a Series from raw strings with the resolved dtype. */
function buildSeries(
  name: string,
  raws: readonly string[],
  dtypeName: DtypeName,
  naSet: ReadonlySet<string>,
  forced: boolean,
): Series<Scalar> {
  const data: Scalar[] = raws.map((r) =>
    forced ? parseForced(r, dtypeName, naSet) : parseInferred(r, dtypeName, naSet),
  );
  return new Series({ data, name, dtype: Dtype.from(dtypeName) });
}

// ─── column assembly ──────────────────────────────────────────────────────────

/** Transpose a row-major matrix into a column-major map of raw strings. */
function transposeRows(rows: readonly (readonly string[])[], numCols: number): readonly string[][] {
  return Array.from({ length: numCols }, (_, ci) =>
    rows.map((r) => {
      const v = r[ci];
      return v ?? "";
    }),
  );
}

/** True when the column at position `ci` with name `name` should be the index. */
function isIndexCol(name: string, ci: number, indexCol: string | number | null): boolean {
  if (indexCol === null) {
    return false;
  }
  if (typeof indexCol === "string") {
    return indexCol === name;
  }
  return indexCol === ci;
}

// ─── public: readFwf ─────────────────────────────────────────────────────────

/**
 * Parse a fixed-width formatted text string into a {@link DataFrame}.
 *
 * Mirrors `pandas.read_fwf()`. Column boundaries are either inferred
 * automatically from whitespace patterns or provided explicitly via
 * `colspecs` / `widths`.
 *
 * ```ts
 * import { readFwf } from "tsb";
 *
 * const text = [
 *   "id  name     score",
 *   "1   Alice    95.5 ",
 *   "2   Bob      87.0 ",
 * ].join("\n");
 *
 * const df = readFwf(text);
 * // DataFrame: id=[1,2], name=["Alice","Bob"], score=[95.5,87.0]
 * ```
 *
 * @param text    Raw text content.
 * @param options Parsing options (see {@link ReadFwfOptions}).
 */
export function readFwf(text: string, options: ReadFwfOptions = {}): DataFrame {
  const headerRow = options.header === undefined ? 0 : options.header;
  const indexCol = options.indexCol ?? null;
  const dtypeMap: Readonly<Record<string, DtypeName>> = options.dtype ?? {};
  const skipRows = options.skipRows ?? 0;
  const nRows = options.nRows ?? null;
  const naSet = buildNaSet(options.naValues);
  const inferNrows = options.inferNrows ?? 100;

  const allLines = splitLines(text);

  // Identify which lines are header vs data.
  let headerLineIdx: number | null = null;
  let dataStart = 0;
  if (headerRow !== null && headerRow >= 0) {
    headerLineIdx = headerRow;
    dataStart = headerRow + 1;
  }

  // Apply skipRows on top of dataStart, then nRows limit.
  let dataLines = allLines.slice(dataStart + skipRows);
  if (nRows !== null) {
    dataLines = dataLines.slice(0, nRows);
  }

  // Resolve colspecs.
  let specs: ColSpec[];
  if (options.widths !== undefined) {
    specs = widthsToColspecs(options.widths);
  } else if (options.colspecs !== undefined && options.colspecs !== "infer") {
    specs = [...options.colspecs];
  } else {
    // Auto-infer from sample lines (data lines only, not the header).
    const sampleLines = dataLines.slice(0, inferNrows);
    specs = inferColspecs(sampleLines);
  }

  if (specs.length === 0) {
    return new DataFrame(new Map(), new Index<Label>([]));
  }

  // Determine column names.
  let colNames: string[];
  if (options.names !== undefined && options.names.length > 0) {
    colNames = [...options.names];
    // If `header` is set, the header line is consumed but the provided names
    // override it — mirror pandas behaviour.
  } else if (headerLineIdx !== null && headerLineIdx < allLines.length) {
    const headerLine = allLines[headerLineIdx] as string;
    colNames = extractFields(headerLine, specs);
  } else {
    // No header — generate numeric names.
    colNames = specs.map((_, i) => String(i));
  }

  // If no data rows, return empty DataFrame with column structure.
  if (dataLines.length === 0) {
    const colMap = new Map<string, Series<Scalar>>();
    for (const name of colNames) {
      colMap.set(name, new Series({ data: [], name }));
    }
    return new DataFrame(colMap, new Index<Label>([]));
  }

  // Parse all data rows.
  const rows: string[][] = dataLines.map((l) => extractFields(l, specs));

  // Transpose to column-major layout.
  const numCols = Math.max(colNames.length, specs.length);
  const rawCols = transposeRows(rows, numCols);

  // Build Series for each column.
  const colMap = new Map<string, Series<Scalar>>();
  let indexSeries: Series<Scalar> | null = null;

  for (let ci = 0; ci < numCols; ci++) {
    const name = colNames[ci] ?? String(ci);
    const raws = rawCols[ci] ?? [];
    const forcedDtype: DtypeName | undefined = dtypeMap[name];
    const forced = forcedDtype !== undefined;
    const dtypeName: DtypeName = forced
      ? (forcedDtype as DtypeName)
      : inferColumnDtype(raws, naSet);
    const series = buildSeries(name, raws, dtypeName, naSet, forced);

    if (isIndexCol(name, ci, indexCol)) {
      indexSeries = series;
    } else {
      colMap.set(name, series);
    }
  }

  const rowIndex: Index<Label> =
    indexSeries !== null
      ? new Index<Label>(indexSeries.values as readonly Label[])
      : (new RangeIndex(rows.length) as unknown as Index<Label>);

  return new DataFrame(colMap, rowIndex);
}
