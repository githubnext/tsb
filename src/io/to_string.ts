/**
 * to_string — render a DataFrame or Series as a fixed-width text table.
 *
 * Mirrors `pandas.DataFrame.to_string()` / `Series.to_string()`: produces a
 * plain-text, column-aligned representation suitable for console output,
 * logging, or plain-text reports.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameToString } from "tsb";
 *
 * const df = DataFrame.fromColumns({ name: ["Alice", "Bob"], age: [30, 25] });
 * console.log(dataFrameToString(df));
 * //     name  age
 * // 0  Alice   30
 * // 1    Bob   25
 * ```
 */

import type { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── numeric detection regex (module-top for biome useTopLevelRegex) ──────────

const NUMERIC_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for `dataFrameToString()` and `seriesToString()`. */
export interface ToStringOptions {
  /**
   * Include the row index as the left-most column.
   * @default true
   */
  readonly index?: boolean;
  /**
   * Maximum number of rows to display before truncating with `…`.
   * @default 60
   */
  readonly maxRows?: number;
  /**
   * Maximum number of columns to display.
   * @default 20
   */
  readonly maxCols?: number;
  /**
   * Minimum character width for each column.
   * @default 0
   */
  readonly colSpace?: number;
  /**
   * Representation for missing values (`null`, `undefined`, `NaN`).
   * @default "NaN"
   */
  readonly naRep?: string;
  /**
   * Number of decimal places for floating-point numbers.
   * @default undefined (no rounding)
   */
  readonly floatPrecision?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` should be displayed as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Format a single scalar cell. */
function fmtScalar(v: Scalar, naRep: string, fp: number | undefined): string {
  if (isMissing(v)) {
    return naRep;
  }
  if (typeof v === "number" && fp !== undefined) {
    return v.toFixed(fp);
  }
  return String(v);
}

/** True when all non-empty cells look like numbers (so column is right-aligned). */
function isNumericCol(cells: readonly string[], naRep: string): boolean {
  for (const c of cells) {
    if (c === naRep || c === "") {
      continue;
    }
    if (!NUMERIC_RE.test(c)) {
      return false;
    }
  }
  return cells.length > 0;
}

/** Width = max of minWidth and every cell length. */
function computeWidth(header: string, cells: readonly string[], minWidth: number): number {
  let w = Math.max(header.length, minWidth);
  for (const c of cells) {
    if (c.length > w) {
      w = c.length;
    }
  }
  return w;
}

/** Pad `s` to exactly `w` characters; right-align if `right` is true. */
function padCell(s: string, w: number, right: boolean): string {
  return right ? s.padStart(w) : s.padEnd(w);
}

/** Join a row of cells separated by two spaces. */
function joinRow(
  cells: readonly string[],
  widths: readonly number[],
  aligns: readonly boolean[],
): string {
  const parts: string[] = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i] ?? "";
    const w = widths[i] ?? c.length;
    const a = aligns[i] ?? false;
    parts.push(padCell(c, w, a));
  }
  return parts.join("  ");
}

/** Select which row positions to display given maxRows (returns -1 as ellipsis sentinel). */
function selectRowPositions(nRows: number, maxRows: number): readonly number[] {
  if (nRows <= maxRows) {
    return Array.from({ length: nRows }, (_, i) => i);
  }
  const half = Math.floor(maxRows / 2);
  const head = Array.from({ length: half }, (_, i) => i);
  const tail = Array.from({ length: half }, (_, i) => nRows - half + i);
  return [...head, -1, ...tail];
}

/** Ellipsis cell for truncated column. */
function ellipsisRow(nCols: number, widths: readonly number[]): string {
  const cells: string[] = [];
  for (let i = 0; i < nCols; i++) {
    const w = widths[i] ?? 3;
    cells.push("...".padStart(w));
  }
  return cells.join("  ");
}

/** Intermediate result of building column cell data. */
interface ColLayout {
  headers: string[];
  cells: string[][];
  widths: number[];
  aligns: boolean[];
}

/** Build cell data for all display columns. */
function buildColLayout(
  df: DataFrame,
  colNames: readonly string[],
  rowPositions: readonly number[],
  colSpace: number,
  naRep: string,
  fp: number | undefined,
): ColLayout {
  const headers: string[] = [];
  const cells: string[][] = [];
  const widths: number[] = [];
  const aligns: boolean[] = [];
  for (const name of colNames) {
    const series = df.col(name);
    const colCells = rowPositions.map((p) =>
      p === -1 ? "..." : fmtScalar(series.values[p] ?? null, naRep, fp),
    );
    headers.push(name);
    cells.push(colCells);
    widths.push(computeWidth(name, colCells, colSpace));
    aligns.push(isNumericCol(colCells, naRep));
  }
  return { headers, cells, widths, aligns };
}

/** Build index cells and width for display. */
function buildIndexInfo(
  df: DataFrame,
  rowPositions: readonly number[],
  colSpace: number,
  naRep: string,
  showIndex: boolean,
): { cells: string[]; width: number } {
  if (!showIndex) {
    return { cells: [], width: 0 };
  }
  const indexValues = df.index.values;
  const cells = rowPositions.map((p) =>
    p === -1 ? "..." : fmtScalar(indexValues[p] ?? null, naRep, undefined),
  );
  return { cells, width: computeWidth("", cells, colSpace) };
}

/** Build all data row strings. */
function buildDataLines(
  rowPositions: readonly number[],
  showIndex: boolean,
  idxCells: readonly string[],
  layout: ColLayout,
  truncCols: boolean,
  allWidths: readonly number[],
  allAligns: readonly boolean[],
  nDisplayCols: number,
): string[] {
  const lines: string[] = [];
  for (let ri = 0; ri < rowPositions.length; ri++) {
    const pos = rowPositions[ri];
    if (pos === -1) {
      const nCols = showIndex ? nDisplayCols + 1 : nDisplayCols;
      lines.push(ellipsisRow(nCols, allWidths));
    } else {
      lines.push(
        buildDataRowLine(ri, showIndex, idxCells, layout, truncCols, allWidths, allAligns),
      );
    }
  }
  return lines;
}

/** Build a single data row string (non-ellipsis row). */
function buildDataRowLine(
  ri: number,
  showIndex: boolean,
  idxCells: readonly string[],
  layout: ColLayout,
  truncCols: boolean,
  allWidths: readonly number[],
  allAligns: readonly boolean[],
): string {
  const rowCells: string[] = [];
  if (showIndex) {
    rowCells.push(idxCells[ri] ?? "");
  }
  for (const cells of layout.cells) {
    rowCells.push(cells[ri] ?? "");
  }
  if (truncCols) {
    rowCells.push("...");
  }
  return joinRow(rowCells, allWidths, allAligns);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Render a `DataFrame` as a fixed-width plain-text table.
 *
 * @param df      - Source DataFrame.
 * @param options - Display options.
 */
export function dataFrameToString(df: DataFrame, options: ToStringOptions = {}): string {
  const showIndex = options.index !== false;
  const maxRows = options.maxRows ?? 60;
  const maxCols = options.maxCols ?? 20;
  const colSpace = options.colSpace ?? 0;
  const naRep = options.naRep ?? "NaN";
  const fp = options.floatPrecision;

  const allColNames = df.columns.values;
  const truncCols = allColNames.length > maxCols;
  const colNames = truncCols ? allColNames.slice(0, maxCols) : allColNames;

  const rowPositions = selectRowPositions(df.shape[0], maxRows);
  const idxInfo = buildIndexInfo(df, rowPositions, colSpace, naRep, showIndex);
  const layout = buildColLayout(df, colNames, rowPositions, colSpace, naRep, fp);

  const allWidths = showIndex ? [idxInfo.width, ...layout.widths] : layout.widths;
  const allAligns = showIndex ? [true, ...layout.aligns] : layout.aligns;

  const headerCells = showIndex ? ["", ...layout.headers] : layout.headers;
  const headerLine = joinRow(headerCells, allWidths, allAligns);

  const dataLines = buildDataLines(
    rowPositions,
    showIndex,
    idxInfo.cells,
    layout,
    truncCols,
    allWidths,
    allAligns,
    colNames.length,
  );

  return [headerLine, ...dataLines].join("\n");
}

/**
 * Render a `Series` as a fixed-width plain-text list.
 *
 * @param series  - Source Series.
 * @param options - Display options.
 */
export function seriesToString(series: Series<Scalar>, options: ToStringOptions = {}): string {
  const showIndex = options.index !== false;
  const maxRows = options.maxRows ?? 60;
  const colSpace = options.colSpace ?? 0;
  const naRep = options.naRep ?? "NaN";
  const fp = options.floatPrecision;

  const nRows = series.size;
  const rowPositions = selectRowPositions(nRows, maxRows);

  const valCells = rowPositions.map((p) =>
    p === -1 ? "..." : fmtScalar(series.values[p] ?? null, naRep, fp),
  );
  const valWidth = computeWidth("", valCells, colSpace);
  const valNumeric = isNumericCol(valCells, naRep);

  if (!showIndex) {
    return valCells.map((c) => padCell(c, valWidth, valNumeric)).join("\n");
  }

  const indexValues = series.index.values;
  const idxCells = rowPositions.map((p) =>
    p === -1 ? "..." : fmtScalar(indexValues[p] ?? null, naRep, undefined),
  );
  const idxWidth = computeWidth("", idxCells, colSpace);

  const lines: string[] = [];
  for (let i = 0; i < rowPositions.length; i++) {
    const ic = idxCells[i] ?? "";
    const vc = valCells[i] ?? "";
    lines.push(`${padCell(ic, idxWidth, true)}    ${padCell(vc, valWidth, valNumeric)}`);
  }

  const name = series.name;
  if (name !== null) {
    lines.push(`Name: ${name}, dtype: ${series.dtype.name}`);
  }

  return lines.join("\n");
}
