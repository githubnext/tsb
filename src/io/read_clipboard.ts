/**
 * Clipboard I/O helpers.
 *
 * - `readClipboard` — parse clipboard text (TSV or CSV) into a DataFrame
 * - `toClipboard`   — serialize a DataFrame to a TSV string suitable for pasting
 *
 * In a browser environment, integrate with `navigator.clipboard`:
 *
 * ```ts
 * const text = await navigator.clipboard.readText();
 * const df = readClipboard(text);
 * ```
 *
 * In a Node/Bun environment, pipe from `pbpaste` (macOS), `xclip`, or
 * `xsel`, and pass the resulting string to `readClipboard`.
 *
 * @example
 * ```ts
 * import { readClipboard, toClipboard } from "tsb";
 *
 * const text = "a\tb\tc\n1\t2\t3\n4\t5\t6";
 * const df = readClipboard(text);
 * console.log(df.shape); // [2, 3]
 * console.log(toClipboard(df)); // "a\tb\tc\n1\t2\t3\n4\t5\t6"
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for {@link readClipboard}. */
export interface ReadClipboardOptions {
  /**
   * Column separator. Auto-detected as `"\t"` (TSV) when the first line
   * contains a tab, otherwise `","` (CSV). Override explicitly if needed.
   */
  sep?: string;
  /**
   * Whether the first row is a header. Defaults to `true`.
   */
  header?: boolean;
  /**
   * Values to interpret as NA/null. Defaults to `["", "NA", "NaN", "null", "None"]`.
   */
  naValues?: readonly string[];
  /**
   * Whether to infer numeric and boolean column types. Defaults to `true`.
   */
  inferTypes?: boolean;
}

/** Options for {@link toClipboard}. */
export interface ToClipboardOptions {
  /**
   * Column separator. Defaults to `"\t"` (TSV for clipboard compatibility).
   */
  sep?: string;
  /**
   * Whether to include the index column. Defaults to `false`.
   */
  index?: boolean;
  /**
   * Whether to write the header row. Defaults to `true`.
   */
  header?: boolean;
  /**
   * String to use for `null`/`NaN` values. Defaults to `""`.
   */
  naRep?: string;
}

// ─── auto-detect separator ────────────────────────────────────────────────────

function detectSep(firstLine: string): string {
  return firstLine.includes("\t") ? "\t" : ",";
}

// ─── type inference helpers ───────────────────────────────────────────────────

function tryParseNumber(s: string): number | null {
  if (s.trim() === "") {
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function tryParseBool(s: string): boolean | null {
  const lower = s.trim().toLowerCase();
  if (lower === "true") {
    return true;
  }
  if (lower === "false") {
    return false;
  }
  return null;
}

function inferColumn(rawValues: readonly string[], naSet: Set<string>): Scalar[] {
  const typed: Scalar[] = rawValues.map((v) => {
    if (naSet.has(v.trim())) {
      return null;
    }
    const b = tryParseBool(v);
    if (b !== null) {
      return b;
    }
    const n = tryParseNumber(v);
    if (n !== null) {
      return n;
    }
    return v;
  });
  return typed;
}

// ─── CSV/TSV line parser ──────────────────────────────────────────────────────

/** Parse a double-quoted CSV field starting at position i+1 in line. Returns {field, next}. */
function parseQuotedField(line: string, start: number): { field: string; next: number } {
  let j = start;
  let field = "";
  while (j < line.length) {
    if (line[j] === '"') {
      if (line[j + 1] === '"') {
        field += '"';
        j += 2;
      } else {
        j++;
        break;
      }
    } else {
      field += line[j];
      j++;
    }
  }
  return { field, next: j };
}

/** Split a single delimited line, handling quoted fields. */
function splitLine(line: string, sep: string): string[] {
  if (sep !== ",") {
    return line.split(sep);
  }
  // For CSV: handle quoted fields
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      const { field, next } = parseQuotedField(line, i + 1);
      fields.push(field);
      i = line[next] === sep ? next + 1 : next;
    } else {
      const end = line.indexOf(sep, i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

/** Extract column names and data lines from non-empty rows. */
function parseHeaderAndData(
  nonEmpty: string[],
  sep: string,
  header: boolean,
): { colNames: string[]; dataLines: string[] } {
  if (header) {
    return {
      colNames: splitLine(nonEmpty[0] ?? "", sep).map((s) => s.trim()),
      dataLines: nonEmpty.slice(1),
    };
  }
  const firstRow = splitLine(nonEmpty[0] ?? "", sep);
  return {
    colNames: firstRow.map((_, i) => String(i)),
    dataLines: nonEmpty,
  };
}

/** Parse data lines into raw per-column string arrays. */
function parseRawCols(dataLines: string[], colNames: string[], sep: string): string[][] {
  const rawCols: string[][] = colNames.map(() => []);
  for (const line of dataLines) {
    const fields = splitLine(line, sep);
    for (let j = 0; j < colNames.length; j++) {
      (rawCols[j] as string[]).push(fields[j] ?? "");
    }
  }
  return rawCols;
}

// ─── readClipboard ────────────────────────────────────────────────────────────

/**
 * Parse a clipboard text string (TSV or CSV) into a DataFrame.
 *
 * Auto-detects the separator from the first line (tab → TSV, else CSV).
 * Type inference converts numeric and boolean strings automatically.
 *
 * @param text    - Raw text from the clipboard.
 * @param options - Parsing options.
 * @returns A DataFrame with one column per field and one row per data line.
 *
 * @example
 * ```ts
 * const df = readClipboard("x\ty\n1\t2\n3\t4");
 * df.columns.values; // ["x", "y"]
 * df.shape;          // [2, 2]
 * ```
 */
export function readClipboard(text: string, options: ReadClipboardOptions = {}): DataFrame {
  const { header = true, naValues, inferTypes = true } = options;

  // Normalise line endings and trim trailing blank lines
  const nonEmpty = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (nonEmpty.length === 0) {
    return DataFrame.fromColumns({});
  }

  const sep = options.sep ?? detectSep(nonEmpty[0] ?? "");
  const naSet = new Set<string>(
    naValues ?? ["", "NA", "NaN", "nan", "null", "None", "N/A", "#N/A"],
  );

  const { colNames, dataLines } = parseHeaderAndData(nonEmpty, sep, header);

  if (dataLines.length === 0) {
    const emptyData: Record<string, Scalar[]> = {};
    for (const col of colNames) {
      emptyData[col] = [];
    }
    return DataFrame.fromColumns(emptyData);
  }

  const rawCols = parseRawCols(dataLines, colNames, sep);

  const data: Record<string, Scalar[]> = {};
  for (let j = 0; j < colNames.length; j++) {
    const name = colNames[j] ?? String(j);
    const raw = rawCols[j] ?? [];
    data[name] = inferTypes ? inferColumn(raw, naSet) : raw.map((v) => v);
  }

  return DataFrame.fromColumns(data as Readonly<Record<string, readonly Scalar[]>>);
}

// ─── toClipboard ─────────────────────────────────────────────────────────────

/**
 * Serialize a DataFrame to a delimited string suitable for pasting into a
 * spreadsheet application.
 *
 * Defaults to TSV (tab-separated) format, which Excel, Google Sheets, and
 * LibreOffice Calc all accept natively when pasted.
 *
 * @param df      - The DataFrame to serialize.
 * @param options - Serialization options.
 * @returns A string with one row per observation plus an optional header row.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * toClipboard(df);
 * // "a\tb\n1\t3\n2\t4"
 * ```
 */
/** Serialize a single value for clipboard output, using naRep for null/NaN. */
function serializeValue(val: unknown, naRep: string): string {
  if (val === null || val === undefined || (typeof val === "number" && Number.isNaN(val))) {
    return naRep;
  }
  return String(val);
}

/** Build a single data row from DataFrame columns at row index i. */
function buildRow(
  df: DataFrame,
  cols: readonly string[],
  i: number,
  includeIndex: boolean,
  sep: string,
  naRep: string,
): string {
  const parts: string[] = [];
  if (includeIndex) {
    parts.push(String(df.index.values[i] ?? i));
  }
  for (const col of cols) {
    const series = df.get(col);
    const val = series?.values[i] ?? null;
    parts.push(serializeValue(val, naRep));
  }
  return parts.join(sep);
}

export function toClipboard(df: DataFrame, options: ToClipboardOptions = {}): string {
  const { sep = "\t", index = false, header = true, naRep = "" } = options;

  const cols = df.columns.values as string[];
  const nRows = df.shape[0];
  const lines: string[] = [];

  if (header) {
    const headerCols = index ? ["", ...cols] : cols;
    lines.push(headerCols.join(sep));
  }

  for (let i = 0; i < nRows; i++) {
    lines.push(buildRow(df, cols, i, index, sep, naRep));
  }

  return lines.join("\n");
}
