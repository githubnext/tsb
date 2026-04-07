/**
 * readFwf — Fixed-Width Format reader.
 *
 * Mirrors `pandas.read_fwf()`:
 * - Parses text where columns occupy fixed character positions.
 * - Supports auto-inferred column boundaries, explicit `colspecs`, or column `widths`.
 * - Options: `header`, `names`, `skipRows`, `nRows`, `comment`, `naValues`, `indexCol`.
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
 * A column specification: `[start, end]` where start is inclusive and end is
 * exclusive — the same convention pandas uses.
 */
export type Colspec = readonly [number, number];

/** Options for {@link readFwf}. */
export interface ReadFwfOptions {
  /**
   * Explicit column boundaries as `[start, end]` pairs (end-exclusive).
   * If omitted, boundaries are inferred from whitespace patterns in the first
   * `inferNRows` rows.
   */
  readonly colspecs?: readonly Colspec[];
  /**
   * Column widths (alternative to `colspecs`).  Each width defines the number
   * of characters in that column, starting from column 0 or after the previous
   * column.  Ignored when `colspecs` is supplied.
   */
  readonly widths?: readonly number[];
  /**
   * Row index of the header row, or `null` for no header.
   * Default: `0` (first data row is the header).
   */
  readonly header?: number | null;
  /**
   * Explicit column names.  When provided the header row (if any) is skipped
   * and these names are used instead.
   */
  readonly names?: readonly string[];
  /**
   * Number of data rows to skip before reading.  Applied after the header.
   * Default: `0`.
   */
  readonly skipRows?: number;
  /**
   * Maximum number of data rows to read.  Default: unlimited.
   */
  readonly nRows?: number;
  /**
   * Single character that marks the start of a comment; lines beginning with
   * this character are ignored.  Default: `null` (no comment stripping).
   */
  readonly comment?: string | null;
  /**
   * Additional strings to treat as missing/NA (supplementing built-in defaults).
   */
  readonly naValues?: readonly string[];
  /**
   * Column name or index to use as the row index.  Default: `null`.
   */
  readonly indexCol?: string | number | null;
  /**
   * How many sample lines to use when inferring column boundaries.
   * Default: `100`.
   */
  readonly inferNRows?: number;
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
  "nan",
  "<NA>",
  "missing",
]);

const RE_INT = /^-?[0-9]+$/;
const RE_FLOAT = /^-?[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?$/;
const RE_BOOL_TRUE = /^(true|True|TRUE|1|yes|Yes|YES)$/;
const RE_BOOL_FALSE = /^(false|False|FALSE|0|no|No|NO)$/;

// ─── boundary inference ───────────────────────────────────────────────────────

/**
 * Infer colspecs from a sample of text lines by finding contiguous regions of
 * non-whitespace characters.  Returns column boundaries as `[start, end]`
 * pairs (end-exclusive).
 */
function inferColspecs(lines: readonly string[]): Colspec[] {
  // Collect every character position that contains a non-whitespace character
  // across *all* sample lines.
  const contentPositions = new Set<number>();
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      if (line.charAt(i) !== " ") {
        contentPositions.add(i);
      }
    }
  }

  if (contentPositions.size === 0) {
    return [];
  }

  // Sort positions and group into contiguous runs (columns).
  const sorted = [...contentPositions].sort((a, b) => a - b);
  const specs: Colspec[] = [];
  // Safe: we know sorted.length > 0 because contentPositions.size > 0.
  let start = 0;
  let prev = 0;
  let first = true;

  for (const pos of sorted) {
    if (first) {
      start = pos;
      prev = pos;
      first = false;
      continue;
    }
    if (pos > prev + 1) {
      // Gap → end of current column.
      specs.push([start, prev + 1]);
      start = pos;
    }
    prev = pos;
  }
  specs.push([start, prev + 1]);

  return specs;
}

/** Convert `widths` to `colspecs`. */
function widthsToColspecs(widths: readonly number[]): Colspec[] {
  const specs: Colspec[] = [];
  let offset = 0;
  for (const w of widths) {
    specs.push([offset, offset + w]);
    offset += w;
  }
  return specs;
}

// ─── parsing helpers ──────────────────────────────────────────────────────────

function isNaRaw(raw: string, naSet: ReadonlySet<string>): boolean {
  return naSet.has(raw);
}

function inferDtype(raws: readonly string[], naSet: ReadonlySet<string>): DtypeName {
  const nonMissing = raws.filter((r) => !isNaRaw(r, naSet));
  if (nonMissing.length === 0) {
    return "object";
  }
  if (nonMissing.every((r) => RE_BOOL_TRUE.test(r) || RE_BOOL_FALSE.test(r))) {
    return "bool";
  }
  if (nonMissing.every((r) => RE_INT.test(r))) {
    return "int64";
  }
  if (nonMissing.every((r) => RE_FLOAT.test(r))) {
    return "float64";
  }
  return "string";
}

function parseScalar(raw: string, dtype: DtypeName, naSet: ReadonlySet<string>): Scalar {
  if (isNaRaw(raw, naSet)) {
    return null;
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

function buildSeries(
  name: string,
  raws: readonly string[],
  naSet: ReadonlySet<string>,
): Series<Scalar> {
  const dtype = inferDtype(raws, naSet);
  const data: Scalar[] = raws.map((r) => parseScalar(r, dtype, naSet));
  return new Series({ data, name, dtype: Dtype.from(dtype) });
}

// ─── main implementation ──────────────────────────────────────────────────────

/**
 * Parse a fixed-width format text into a `DataFrame`.
 *
 * Mirrors `pandas.read_fwf()`.
 *
 * ```ts
 * const text = [
 *   "Name       Age  Score",
 *   "Alice       29   88.5",
 *   "Bob         34   91.0",
 * ].join("\n");
 *
 * const df = readFwf(text);
 * // DataFrame with columns: Name, Age, Score
 * ```
 */
export function readFwf(text: string, options?: ReadFwfOptions): DataFrame {
  const headerOpt = options?.header ?? 0;
  const namesOpt = options?.names;
  const skipRows = options?.skipRows ?? 0;
  const nRowsMax = options?.nRows ?? Infinity;
  const commentChar = options?.comment ?? null;
  const indexCol = options?.indexCol ?? null;
  const inferNRows = options?.inferNRows ?? 100;

  // Build NA set.
  const naSet: Set<string> = new Set(DEFAULT_NA_STRINGS);
  for (const v of options?.naValues ?? []) {
    naSet.add(v);
  }

  // Split into lines, drop BOM, strip trailing CR.
  const rawLines = text
    .replace(/^\uFEFF/, "")
    .split("\n")
    .map((l) => l.replace(/\r$/, ""));

  // Filter comment lines.
  const lines = commentChar
    ? rawLines.filter((l) => !l.startsWith(commentChar))
    : rawLines;

  // Determine colspecs.
  let colspecs: readonly Colspec[];
  if (options?.colspecs !== undefined) {
    colspecs = options.colspecs;
  } else if (options?.widths !== undefined) {
    colspecs = widthsToColspecs(options.widths);
  } else {
    // Infer from sample lines (skip blank lines for inference).
    const sampleLines = lines.filter((l) => l.trim().length > 0).slice(0, inferNRows);
    colspecs = inferColspecs(sampleLines);
  }

  /** Extract one row from a text line using colspecs. */
  function parseLine(line: string): string[] {
    return colspecs.map(([s, e]) => line.slice(s, e).trim());
  }

  // Find header row and column names.
  let colNames: string[];
  let dataStartIdx: number;

  if (namesOpt !== undefined) {
    // Explicit names — skip header row if header is not null.
    colNames = [...namesOpt];
    dataStartIdx = headerOpt !== null ? (headerOpt as number) + 1 : 0;
  } else if (headerOpt === null) {
    // No header — generate numeric column names.
    colNames = colspecs.map((_, i) => String(i));
    dataStartIdx = 0;
  } else {
    const headerIdx = headerOpt as number;
    // Find the headerIdx-th non-blank line.
    let found = 0;
    let lineIdx = 0;
    for (; lineIdx < lines.length; lineIdx++) {
      const l = lines[lineIdx];
      if (l !== undefined && l.trim().length > 0) {
        if (found === headerIdx) {
          break;
        }
        found++;
      }
    }
    const headerLine = lines[lineIdx] ?? "";
    colNames = parseLine(headerLine);
    dataStartIdx = lineIdx + 1;
  }

  // Collect data lines.
  const dataLines = lines.slice(dataStartIdx).filter((l) => l.trim().length > 0);

  // Apply skipRows / nRows.
  const sliced = dataLines.slice(skipRows, nRowsMax === Infinity ? undefined : skipRows + nRowsMax);

  // Parse rows into column arrays.
  const numCols = colNames.length;
  const rawCols: string[][] = Array.from({ length: numCols }, (): string[] => []);

  for (const line of sliced) {
    const cells = parseLine(line);
    for (let ci = 0; ci < numCols; ci++) {
      const cell = cells[ci];
      (rawCols[ci] as string[]).push(cell ?? "");
    }
  }

  // Build column series.
  const colMap = new Map<string, Series<Scalar>>();
  let indexSeries: Series<Scalar> | null = null;
  const indexColName: Label | null =
    typeof indexCol === "number" ? (colNames[indexCol] ?? null) : indexCol;

  for (let ci = 0; ci < numCols; ci++) {
    const name = colNames[ci] ?? String(ci);
    const raws = rawCols[ci] as string[];
    const s = buildSeries(name, raws, naSet);
    if (name === indexColName || ci === indexCol) {
      indexSeries = s;
    } else {
      colMap.set(name, s);
    }
  }

  // Build row index.
  const rowIndex: Index =
    indexSeries !== null
      ? new Index([...indexSeries.values], indexSeries.name ?? undefined)
      : new RangeIndex(sliced.length);

  return new DataFrame(colMap, rowIndex);
}
