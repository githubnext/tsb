/**
 * toExcel — write a DataFrame to an XLSX file.
 *
 * Mirrors `pandas.DataFrame.to_excel()`:
 * - `toExcel(df, options?)` — serialize a DataFrame to an XLSX binary buffer.
 *
 * Returns a `Uint8Array` containing the raw XLSX binary data. Write it to disk
 * or serve it via HTTP with content-type
 * `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
 *
 * Supports:
 * - All scalar types: string, number, bigint, boolean, null/undefined, Date, TimedeltaLike
 * - Shared string table (SST) for string cells
 * - Optional row index column (default: true)
 * - Optional header row (default: true)
 * - Column subset via `columns` option
 * - `startRow` / `startCol` offsets (default: 0)
 * - `naRep` for missing values (default: "")
 *
 * Limitations:
 * - Single sheet only
 * - No cell formatting or merged cells
 * - Dates stored as ISO-8601 strings, not Excel date serials
 *
 * @module
 */
// biome-ignore lint/correctness/noNodejsModules: ZIP DEFLATE requires node:zlib
import { deflateRawSync } from "node:zlib";
import { DataFrame } from "../core/frame.ts";
import type { Scalar } from "../types.ts";

// ─── Public Types ─────────────────────────────────────────────────────────────

/** Options for {@link toExcel}. */
export interface ToExcelOptions {
  /** Worksheet name. Default: `"Sheet1"`. */
  readonly sheetName?: string;
  /**
   * Write the DataFrame row index as the first column.
   * Default: `true`.
   */
  readonly index?: boolean;
  /**
   * Write column names as the first row.
   * Default: `true`.
   */
  readonly header?: boolean;
  /**
   * String used to represent missing values (`null`, `undefined`, `NaN`).
   * Default: `""` (empty string — cell is left blank).
   */
  readonly naRep?: string;
  /**
   * Subset of columns to write, in the given order.
   * Default: all columns in their current order.
   */
  readonly columns?: readonly string[];
  /**
   * 0-based row offset at which to start writing. Default: `0`.
   */
  readonly startRow?: number;
  /**
   * 0-based column offset at which to start writing. Default: `0`.
   */
  readonly startCol?: number;
}

// ─── CRC-32 ───────────────────────────────────────────────────────────────────

const CRC32_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (CRC32_TABLE[(crc ^ (data[i] ?? 0)) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── Binary Helpers ───────────────────────────────────────────────────────────

function setU16LE(buf: Uint8Array, off: number, v: number): void {
  buf[off] = v & 0xff;
  buf[off + 1] = (v >>> 8) & 0xff;
}

function setU32LE(buf: Uint8Array, off: number, v: number): void {
  buf[off] = v & 0xff;
  buf[off + 1] = (v >>> 8) & 0xff;
  buf[off + 2] = (v >>> 16) & 0xff;
  buf[off + 3] = (v >>> 24) & 0xff;
}

// ─── ZIP Writer ───────────────────────────────────────────────────────────────

const ZIP_ENC = new TextEncoder();

interface ZipEntry {
  readonly nameBytes: Uint8Array;
  readonly raw: Uint8Array;
  readonly compressed: Uint8Array;
  readonly method: number;
  readonly crc: number;
  localOffset: number;
}

function buildZip(
  files: ReadonlyArray<{ readonly name: string; readonly data: Uint8Array }>,
): Uint8Array {
  const entries: ZipEntry[] = files.map((f) => {
    const nameBytes = ZIP_ENC.encode(f.name);
    const comp = deflateRawSync(f.data, { level: 6 });
    const useDeflate = comp.length < f.data.length;
    return {
      nameBytes,
      raw: f.data,
      compressed: useDeflate ? comp : f.data,
      method: useDeflate ? 8 : 0,
      crc: crc32(f.data),
      localOffset: 0,
    };
  });

  // First pass: compute per-entry local header offsets
  let localTotal = 0;
  for (const e of entries) {
    e.localOffset = localTotal;
    localTotal += 30 + e.nameBytes.length + e.compressed.length;
  }

  // Central directory size
  let cdTotal = 0;
  for (const e of entries) {
    cdTotal += 46 + e.nameBytes.length;
  }

  const buf = new Uint8Array(localTotal + cdTotal + 22);
  let p = 0;

  const pu16 = (v: number): void => {
    setU16LE(buf, p, v);
    p += 2;
  };
  const pu32 = (v: number): void => {
    setU32LE(buf, p, v);
    p += 4;
  };
  const pb = (b: Uint8Array): void => {
    buf.set(b, p);
    p += b.length;
  };

  // Local file headers and data
  for (const e of entries) {
    buf[p++] = 0x50;
    buf[p++] = 0x4b;
    buf[p++] = 0x03;
    buf[p++] = 0x04; // Local file header sig
    pu16(20); // version needed (2.0)
    pu16(0); // flags
    pu16(e.method); // compression
    pu16(0); // mod time
    pu16(0); // mod date
    pu32(e.crc);
    pu32(e.compressed.length);
    pu32(e.raw.length);
    pu16(e.nameBytes.length);
    pu16(0); // extra field length
    pb(e.nameBytes);
    pb(e.compressed);
  }

  // Central directory
  const cdStart = p;
  for (const e of entries) {
    buf[p++] = 0x50;
    buf[p++] = 0x4b;
    buf[p++] = 0x01;
    buf[p++] = 0x02; // CD header sig
    pu16(20); // version made by
    pu16(20); // version needed
    pu16(0); // flags
    pu16(e.method);
    pu16(0); // mod time
    pu16(0); // mod date
    pu32(e.crc);
    pu32(e.compressed.length);
    pu32(e.raw.length);
    pu16(e.nameBytes.length);
    pu16(0); // extra length
    pu16(0); // comment length
    pu16(0); // disk start
    pu16(0); // internal attrs
    pu32(0); // external attrs
    pu32(e.localOffset);
    pb(e.nameBytes);
  }

  // End-of-central-directory record
  buf[p++] = 0x50;
  buf[p++] = 0x4b;
  buf[p++] = 0x05;
  buf[p++] = 0x06; // EOCD sig
  pu16(0); // disk number
  pu16(0); // disk with CD
  pu16(entries.length); // entries on this disk
  pu16(entries.length); // total entries
  pu32(cdTotal); // CD size in bytes
  pu32(cdStart); // offset of first CD header (= localTotal)
  pu16(0); // comment length

  return buf;
}

// ─── XML Helpers ─────────────────────────────────────────────────────────────

function xmlEsc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Convert 0-based column index to Excel letter(s): 0→"A", 25→"Z", 26→"AA". */
function colLetter(n: number): string {
  let s = "";
  let col = n;
  do {
    s = String.fromCharCode(65 + (col % 26)) + s;
    col = Math.floor(col / 26) - 1;
  } while (col >= 0);
  return s;
}

/** Build an Excel cell reference like "A1" from 0-based row and column indices. */
function cellRef(row: number, col: number): string {
  return `${colLetter(col)}${row + 1}`;
}

// ─── XLSX File Builders ───────────────────────────────────────────────────────

const XLSX_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const PKG_NS = "http://schemas.openxmlformats.org/package/2006";
const OD_NS = "http://schemas.openxmlformats.org/officeDocument/2006";

function buildContentTypes(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="${PKG_NS}/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`
  );
}

function buildRootRels(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="${PKG_NS}/relationships">` +
    `<Relationship Id="rId1" Type="${OD_NS}/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`
  );
}

function buildWorkbook(sheetName: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="${XLSX_NS}" xmlns:r="${OD_NS}/relationships">` +
    `<bookViews><workbookView/></bookViews>` +
    `<sheets>` +
    `<sheet name="${xmlEsc(sheetName)}" sheetId="1" r:id="rId1"/>` +
    `</sheets>` +
    `</workbook>`
  );
}

function buildWorkbookRels(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="${PKG_NS}/relationships">` +
    `<Relationship Id="rId1" Type="${OD_NS}/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="${OD_NS}/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
    `<Relationship Id="rId3" Type="${OD_NS}/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`
  );
}

function buildStyles(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="${XLSX_NS}">` +
    `<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="2">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `</fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>` +
    `</styleSheet>`
  );
}

function buildSst(strings: readonly string[]): string {
  const n = strings.length;
  let xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="${XLSX_NS}" count="${n}" uniqueCount="${n}">`;
  for (const s of strings) {
    xml += `<si><t xml:space="preserve">${xmlEsc(s)}</t></si>`;
  }
  xml += `</sst>`;
  return xml;
}

/** Convert a scalar value to the string that goes in the SST or a cell <v>. */
function scalarToString(v: Scalar): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "bigint") return String(v);
  if (v instanceof Date) return v.toISOString();
  // TimedeltaLike
  return `${v.totalMs}ms`;
}

/** Determine whether a scalar is missing (null, undefined, NaN). */
function isMissing(v: Scalar): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "number" && Number.isNaN(v)) return true;
  return false;
}

/** Determine whether a scalar should be written as a numeric cell (not SST). */
function isNumeric(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v) && Number.isFinite(v);
}

function buildSheet(
  rows: ReadonlyArray<ReadonlyArray<Scalar>>,
  sstMap: ReadonlyMap<string, number>,
  naRep: string,
  startRow: number,
  startCol: number,
  nRows: number,
  nCols: number,
): string {
  const parts: string[] = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<worksheet xmlns="${XLSX_NS}">`,
  ];

  if (nRows > 0 && nCols > 0) {
    const r1 = startRow + 1;
    const r2 = startRow + nRows;
    const c1 = colLetter(startCol);
    const c2 = colLetter(startCol + nCols - 1);
    parts.push(`<dimension ref="${c1}${r1}:${c2}${r2}"/>`);
  }

  parts.push("<sheetData>");

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    if (row === undefined) continue;
    const excelRow = startRow + ri + 1;
    parts.push(`<row r="${excelRow}">`);

    for (let ci = 0; ci < row.length; ci++) {
      const v = row[ci];
      const ref = cellRef(startRow + ri, startCol + ci);

      if (v === undefined || isMissing(v)) {
        if (naRep === "") {
          parts.push(`<c r="${ref}"/>`);
        } else {
          const si = sstMap.get(naRep) ?? 0;
          parts.push(`<c r="${ref}" t="s"><v>${si}</v></c>`);
        }
      } else if (typeof v === "boolean") {
        parts.push(`<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`);
      } else if (isNumeric(v)) {
        parts.push(`<c r="${ref}"><v>${v}</v></c>`);
      } else {
        // string, bigint, Date, TimedeltaLike, or non-finite number → SST
        const s = scalarToString(v);
        const si = sstMap.get(s) ?? 0;
        parts.push(`<c r="${ref}" t="s"><v>${si}</v></c>`);
      }
    }

    parts.push("</row>");
  }

  parts.push("</sheetData>");
  parts.push("</worksheet>");
  return parts.join("");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const XLSX_ENC = new TextEncoder();

/**
 * Serialize a DataFrame to an XLSX binary buffer.
 *
 * Mirrors `pandas.DataFrame.to_excel()`.
 *
 * @example
 * ```ts
 * import { DataFrame, toExcel } from "tsb";
 *
 * const df = DataFrame.fromRecords([
 *   { name: "Alice", age: 30 },
 *   { name: "Bob",   age: 25 },
 * ]);
 *
 * const buf = toExcel(df);
 * // Write buf to disk:
 * // await Bun.write("output.xlsx", buf);
 * ```
 */
export function toExcel(df: DataFrame, options?: ToExcelOptions): Uint8Array {
  const sheetName = options?.sheetName ?? "Sheet1";
  const writeIndex = options?.index ?? true;
  const writeHeader = options?.header ?? true;
  const naRep = options?.naRep ?? "";
  const startRow = options?.startRow ?? 0;
  const startCol = options?.startCol ?? 0;

  // Resolve columns to write
  const requestedCols = options?.columns ?? [...df.columns.values];
  for (const c of requestedCols) {
    if (!df.has(c)) {
      throw new Error(`toExcel: column '${c}' not found in DataFrame`);
    }
  }

  const indexVals = df.index.values;
  const nRows = df.index.size;

  // Pre-fetch column arrays to avoid repeated lookups
  const colData: ReadonlyArray<ReadonlyArray<Scalar>> = requestedCols.map((c) =>
    df.col(c).toArray(),
  );

  // ─── Build Shared String Table ─────────────────────────────────────────────

  const sstStrings: string[] = [];
  const sstMap = new Map<string, number>();

  const addStr = (s: string): void => {
    if (!sstMap.has(s)) {
      sstMap.set(s, sstStrings.length);
      sstStrings.push(s);
    }
  };

  // naRep always needs an SST entry (used for missing cells)
  if (naRep !== "") addStr(naRep);

  // Header row strings
  if (writeHeader) {
    if (writeIndex) addStr(""); // corner cell (empty)
    for (const c of requestedCols) addStr(c);
  }

  // Index value strings
  if (writeIndex) {
    for (let ri = 0; ri < nRows; ri++) {
      const iv = indexVals[ri];
      if (isMissing(iv)) {
        // will use naRep
      } else if (iv !== undefined && !isNumeric(iv) && typeof iv !== "boolean") {
        addStr(scalarToString(iv));
      }
      // numeric or boolean index values are written directly (no SST)
    }
  }

  // Data cell strings
  for (let ci = 0; ci < colData.length; ci++) {
    const col = colData[ci];
    if (col === undefined) continue;
    for (let ri = 0; ri < nRows; ri++) {
      const v = col[ri];
      if (v === undefined || isMissing(v)) {
        // will use naRep
      } else if (typeof v === "string") {
        addStr(v);
      } else if (v instanceof Date) {
        addStr(v.toISOString());
      } else if (typeof v === "bigint") {
        addStr(String(v));
      } else if (typeof v === "number" && !Number.isFinite(v)) {
        // Infinity / -Infinity → SST string
        addStr(String(v));
      }
      // number (finite), boolean → no SST entry
    }
  }

  // ─── Build Row Data ────────────────────────────────────────────────────────

  // rows[r][c] = Scalar value (or undefined = missing)
  const nDataCols = (writeIndex ? 1 : 0) + requestedCols.length;
  const nDataRows = (writeHeader ? 1 : 0) + nRows;
  const sheetRows: Array<Array<Scalar>> = [];

  // Header row
  if (writeHeader) {
    const hdr: Array<Scalar> = [];
    if (writeIndex) hdr.push(""); // empty corner
    for (const c of requestedCols) hdr.push(c);
    sheetRows.push(hdr);
  }

  // Data rows
  for (let ri = 0; ri < nRows; ri++) {
    const row: Array<Scalar> = [];
    if (writeIndex) {
      const iv = indexVals[ri];
      row.push(iv !== undefined ? iv : null);
    }
    for (let ci = 0; ci < colData.length; ci++) {
      const col = colData[ci];
      const v = col !== undefined ? col[ri] : undefined;
      row.push(v !== undefined ? v : null);
    }
    sheetRows.push(row);
  }

  // ─── Build XLSX Parts ──────────────────────────────────────────────────────

  const enc = (s: string): Uint8Array => XLSX_ENC.encode(s);

  const sheetXml = buildSheet(sheetRows, sstMap, naRep, startRow, startCol, nDataRows, nDataCols);

  const files: Array<{ name: string; data: Uint8Array }> = [
    { name: "[Content_Types].xml", data: enc(buildContentTypes()) },
    { name: "_rels/.rels", data: enc(buildRootRels()) },
    { name: "xl/workbook.xml", data: enc(buildWorkbook(sheetName)) },
    { name: "xl/_rels/workbook.xml.rels", data: enc(buildWorkbookRels()) },
    { name: "xl/worksheets/sheet1.xml", data: enc(sheetXml) },
    { name: "xl/sharedStrings.xml", data: enc(buildSst(sstStrings)) },
    { name: "xl/styles.xml", data: enc(buildStyles()) },
  ];

  return buildZip(files);
}
