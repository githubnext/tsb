/**
 * CSV I/O — read and write comma-separated value files/strings.
 *
 * Mirrors `pandas.read_csv` and `DataFrame.to_csv`: parse CSV text into a
 * `DataFrame` and serialise a `DataFrame` back to CSV.
 *
 * Features:
 * - Configurable delimiter, quote character
 * - Optional header row (with column name inference)
 * - Optional explicit column name list
 * - Custom NA value strings
 * - Strip leading / trailing whitespace in cells
 * - Numeric and boolean auto-coercion
 * - `toCsv` with header, index, and delimiter options
 *
 * @example
 * ```ts
 * const csv = `name,age\nAlice,30\nBob,25`;
 * const df = readCsv(csv);
 * df.col("age").mean(); // 27.5
 * toCsv(df);
 * // "name,age\nAlice,30\nBob,25\n"
 * ```
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── read_csv options ─────────────────────────────────────────────────────────

/** Options for {@link readCsv}. */
export interface ReadCsvOptions {
  /** Field delimiter character.  Defaults to `","`. */
  readonly sep?: string;

  /**
   * If `true` (default), the first data row is treated as a header.
   * If `false`, column names are generated as `"0"`, `"1"`, etc.
   */
  readonly header?: boolean;

  /**
   * Explicit column names.  When provided, the first row is always treated
   * as data (regardless of `header`).
   */
  readonly names?: readonly string[];

  /**
   * Extra strings that should be interpreted as `null` (missing value), in
   * addition to the built-in set.
   */
  readonly naValues?: readonly string[];

  /**
   * Quote character for fields that contain the delimiter.  Defaults to `'"'`.
   */
  readonly quoteChar?: string;

  /**
   * If `true` (default), strip leading and trailing whitespace from cell values
   * (outside of quoted fields).
   */
  readonly skipInitialSpace?: boolean;

  /**
   * Comment character.  Lines beginning with this character (after optional
   * leading whitespace) are ignored.
   */
  readonly comment?: string;
}

const BUILTIN_NA: readonly string[] = [
  "",
  "NA",
  "N/A",
  "null",
  "NULL",
  "NaN",
  "nan",
  "None",
  "none",
  "#N/A",
  "#NA",
];

// ─── parser helpers ───────────────────────────────────────────────────────────

/**
 * Process a single character while inside a quoted field.
 * Returns the updated `{ current, inQuote, i }` state.
 */
function stepInsideQuote(
  line: string,
  ch: string,
  quoteChar: string,
  current: string,
  i: number,
): { current: string; inQuote: boolean; i: number } {
  if (ch === quoteChar) {
    if (line[i + 1] === quoteChar) {
      return { current: current + quoteChar, inQuote: true, i: i + 2 };
    }
    return { current, inQuote: false, i: i + 1 };
  }
  return { current: current + ch, inQuote: true, i: i + 1 };
}

/**
 * Split a single CSV line into raw field strings, honouring quoted fields.
 * Handles escaped quotes (`""` inside a quoted field).
 */
function splitLine(line: string, sep: string, quoteChar: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i] ?? "";
    if (inQuote) {
      ({ current, inQuote, i } = stepInsideQuote(line, ch, quoteChar, current, i));
    } else if (ch === quoteChar) {
      inQuote = true;
      i++;
    } else if (line.startsWith(sep, i)) {
      fields.push(current);
      current = "";
      i += sep.length;
    } else {
      current += ch;
      i++;
    }
  }
  fields.push(current);
  return fields;
}

/** Coerce a string cell to the most specific TypeScript scalar. */
function coerce(raw: string, naSet: ReadonlySet<string>): Scalar {
  if (naSet.has(raw)) {
    return null;
  }
  if (raw === "true" || raw === "True" || raw === "TRUE") {
    return true;
  }
  if (raw === "false" || raw === "False" || raw === "FALSE") {
    return false;
  }
  const n = Number(raw);
  if (!Number.isNaN(n) && raw.trim() !== "") {
    return n;
  }
  return raw;
}

// ─── readCsv helpers ──────────────────────────────────────────────────────────

/** Strip lines that are empty or begin with the comment character. */
function filterLines(rawLines: string[], commentChar: string | null): string[] {
  return rawLines
    .map((l) => l.trimEnd())
    .filter((l) => {
      if (l === "") {
        return false;
      }
      if (commentChar !== null && l.trimStart().startsWith(commentChar)) {
        return false;
      }
      return true;
    });
}

/** Resolve column names and data lines from the filtered line array. */
function resolveNamesAndData(
  lines: string[],
  options: ReadCsvOptions,
  sep: string,
  quoteChar: string,
  skipSpace: boolean,
): { colNames: string[]; dataLines: string[] } {
  const hasExplicitNames = options.names !== undefined && options.names.length > 0;
  const useHeader = !hasExplicitNames && options.header !== false;

  if (hasExplicitNames) {
    return { colNames: [...(options.names ?? [])], dataLines: lines };
  }
  if (useHeader) {
    const headerLine = lines[0] ?? "";
    const rawFields = splitLine(headerLine, sep, quoteChar);
    return {
      colNames: rawFields.map((f) => (skipSpace ? f.trim() : f)),
      dataLines: lines.slice(1),
    };
  }
  const firstLine = lines[0] ?? "";
  const nCols = splitLine(firstLine, sep, quoteChar).length;
  return {
    colNames: Array.from({ length: nCols }, (_, i) => String(i)),
    dataLines: lines,
  };
}

/** Parse data lines into per-column arrays. */
function parseDataLines(
  dataLines: string[],
  nCols: number,
  sep: string,
  quoteChar: string,
  skipSpace: boolean,
  naSet: ReadonlySet<string>,
): Scalar[][] {
  const columns: Scalar[][] = Array.from({ length: nCols }, () => []);
  for (const line of dataLines) {
    const rawFields = splitLine(line, sep, quoteChar);
    for (let ci = 0; ci < nCols; ci++) {
      const raw = rawFields[ci] ?? "";
      const cell = skipSpace ? raw.trim() : raw;
      columns[ci]?.push(coerce(cell, naSet));
    }
  }
  return columns;
}

// ─── readCsv ──────────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into a `DataFrame`.
 *
 * @param text    - The CSV text to parse.
 * @param options - Parsing options (delimiter, header, NA strings, etc.)
 *
 * @example
 * ```ts
 * const df = readCsv("a,b\n1,2\n3,4");
 * df.col("a").sum(); // 4
 * ```
 */
export function readCsv(text: string, options: ReadCsvOptions = {}): DataFrame {
  const sep = options.sep ?? ",";
  const quoteChar = options.quoteChar ?? '"';
  const skipSpace = options.skipInitialSpace !== false;
  const naSet: ReadonlySet<string> = new Set([...BUILTIN_NA, ...(options.naValues ?? [])]);
  const commentChar = options.comment ?? null;

  const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines = filterLines(rawLines, commentChar);

  if (lines.length === 0) {
    return DataFrame.fromRecords([]);
  }

  const { colNames, dataLines } = resolveNamesAndData(lines, options, sep, quoteChar, skipSpace);
  const nCols = colNames.length;
  const columns = parseDataLines(dataLines, nCols, sep, quoteChar, skipSpace, naSet);

  const record: Record<string, readonly Scalar[]> = {};
  for (let ci = 0; ci < nCols; ci++) {
    record[colNames[ci] ?? String(ci)] = columns[ci] ?? [];
  }
  return DataFrame.fromColumns(record);
}

// ─── to_csv options ───────────────────────────────────────────────────────────

/** Options for {@link toCsv}. */
export interface ToCsvOptions {
  /** Field delimiter.  Defaults to `","`. */
  readonly sep?: string;

  /** If `true` (default), write the header row with column names. */
  readonly header?: boolean;

  /**
   * If `true` (default), write the row index as the first column.
   * If a string, use that string as the index column name.
   * If `false`, omit the index.
   */
  readonly index?: boolean | string;

  /**
   * String to use for missing values (`null` / `undefined` / `NaN`).
   * Defaults to `""`.
   */
  readonly naRep?: string;

  /** Quote character.  Defaults to `'"'`. */
  readonly quoteChar?: string;
}

// ─── toCsv ────────────────────────────────────────────────────────────────────

/**
 * Serialise a `DataFrame` to a CSV string.
 *
 * @param df      - DataFrame to serialise.
 * @param options - Formatting options.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * toCsv(df, { index: false });
 * // "a,b\n1,3\n2,4\n"
 * ```
 */
export function toCsv(df: DataFrame, options: ToCsvOptions = {}): string {
  const sep = options.sep ?? ",";
  const writeHeader = options.header !== false;
  const includeIndex = options.index !== false;
  const indexColName = typeof options.index === "string" ? options.index : "";
  const naRep = options.naRep ?? "";
  const quoteChar = options.quoteChar ?? '"';

  function quoteField(s: string): string {
    if (s.includes(sep) || s.includes(quoteChar) || s.includes("\n")) {
      const escaped = s.replaceAll(quoteChar, quoteChar + quoteChar);
      return `${quoteChar}${escaped}${quoteChar}`;
    }
    return s;
  }

  function cellStr(v: Scalar): string {
    if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
      return naRep;
    }
    return quoteField(String(v));
  }

  const colNames = df.columns.toArray();
  const nRows = df.shape[0];
  const rows: string[] = [];

  if (writeHeader) {
    const headerCells = includeIndex ? [indexColName, ...colNames] : [...colNames];
    rows.push(headerCells.map(quoteField).join(sep));
  }

  for (let ri = 0; ri < nRows; ri++) {
    const cells: string[] = [];
    if (includeIndex) {
      cells.push(cellStr(df.index.at(ri) as Scalar));
    }
    for (const cn of colNames) {
      cells.push(cellStr(df.col(cn).iat(ri)));
    }
    rows.push(cells.join(sep));
  }

  return `${rows.join("\n")}\n`;
}
