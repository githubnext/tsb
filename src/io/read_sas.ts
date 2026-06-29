/**
 * io/read_sas — SAS XPORT (XPT) file reader.
 *
 * Reads SAS Version 5 Transport (XPORT) format files into a {@link DataFrame}.
 * SAS XPORT is a portable ASCII + binary format used extensively by the US
 * FDA, CDC, and other agencies for data submission.
 *
 * Supported:
 * - SAS XPORT Version 5 (`.xpt` files)
 * - Numeric variables (IBM 370 double-precision floating point)
 * - Character variables (fixed-width ASCII strings)
 *
 * Not supported in this implementation:
 * - SAS XPORT Version 8 (multi-member datasets)
 * - SAS7BDAT format (use a dedicated library)
 *
 * @example
 * ```ts
 * import { readSas } from "tsb";
 * import { readFileSync } from "node:fs";
 *
 * const buf = readFileSync("data.xpt");
 * const df = readSas(new Uint8Array(buf.buffer));
 * df.head();
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link readSas}. */
export interface ReadSasOptions {
  /**
   * Column to use as the index.  `null` (default) uses a default integer index.
   */
  readonly index?: string | null;
  /**
   * Character encoding for string variables.
   * Defaults to `"ascii"`.  Only affects how raw bytes are decoded; the
   * underlying data is always 7-bit ASCII in XPORT files.
   */
  readonly encoding?: string;
}

// ─── XPORT format constants ───────────────────────────────────────────────────

const HEADER_MAGIC_LIBRARY =
  "HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!000000000000000000000000000000  ";
const HEADER_MAGIC_MEMBER = "HEADER RECORD*******MEMBER  HEADER RECORD!!!!!!";
const HEADER_MAGIC_NAMESTR = "HEADER RECORD*******NAMESTR HEADER RECORD!!!!!!!";
const HEADER_MAGIC_OBS =
  "HEADER RECORD*******OBS     HEADER RECORD!!!!!!!000000000000000000000000000000  ";

/** Size of each XPORT record in bytes. */
const RECORD_SIZE = 80;

/** Size of a namestr record in bytes. */
const NAMESTR_SIZE = 140;

/** Variable type constant for numeric (IBM 370 double). */
const NTYPE_NUMERIC = 1;

/** Variable type constant for character (fixed-width string). */
const NTYPE_CHAR = 2;

// ─── IBM 370 floating-point conversion ───────────────────────────────────────

/**
 * Convert 8 bytes of IBM 370 hexadecimal floating-point to a JavaScript
 * double-precision floating-point number.
 *
 * IBM 370 format (big-endian):
 * ```
 * Byte 0: [sign (1 bit)][exponent (7 bits, excess-64, base-16)]
 * Bytes 1–7: [56-bit mantissa (hexadecimal fraction)]
 * ```
 * Value = (-1)^sign × 16^(exponent − 64) × mantissa / 2^56
 */
function ibmToDouble(buf: Uint8Array, offset: number): number {
  const b0 = buf[offset] ?? 0;
  if (b0 === 0x00) {
    // First byte is zero — check the full 8 bytes.
    let allZero = true;
    for (let k = 0; k < 8; k++) {
      if ((buf[offset + k] ?? 0) !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero) {
      return 0;
    }
  }
  // SAS missing value: first byte is 0x2e ('.') or A–Z (special missing),
  // AND bytes 1–7 must all be zero. Valid IBM 370 floats in the same first-byte
  // range have a non-zero mantissa in bytes 1–7.
  if (b0 === 0x2e || (b0 >= 0x41 && b0 <= 0x5a)) {
    let mantZero = true;
    for (let k = 1; k < 8; k++) {
      if ((buf[offset + k] ?? 0) !== 0) {
        mantZero = false;
        break;
      }
    }
    if (mantZero) {
      return Number.NaN;
    }
  }

  const sign = (b0 & 0x80) !== 0 ? -1 : 1;
  const exp = (b0 & 0x7f) - 64; // excess-64 base-16 exponent

  // Build the 56-bit mantissa as a number.
  // Bytes 1–7 form the mantissa: each byte contributes 8 bits.
  let mantissa = 0;
  for (let k = 1; k <= 7; k++) {
    mantissa = mantissa * 256 + (buf[offset + k] ?? 0);
  }

  if (mantissa === 0) {
    return 0;
  }

  // mantissa is a 56-bit integer representing the fraction mantissa/2^56
  // value = sign × 16^exp × mantissa / 2^56
  return sign * mantissa * 16 ** exp * 2 ** -56;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

/** Decode a fixed-width ASCII region as a trimmed string. */
function decodeAscii(buf: Uint8Array, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    const byte = buf[offset + i] ?? 0;
    if (byte === 0) {
      break;
    }
    s += String.fromCharCode(byte);
  }
  return s.trimEnd();
}

/** Read a 16-bit big-endian signed integer from `buf` at `offset`. */
function readInt16(buf: Uint8Array, offset: number): number {
  const hi = buf[offset] ?? 0;
  const lo = buf[offset + 1] ?? 0;
  const raw = (hi << 8) | lo;
  // Sign-extend from 16 bits.
  return raw >= 0x8000 ? raw - 0x10000 : raw;
}

/** Read a 32-bit big-endian signed integer from `buf` at `offset`. */
function readInt32(buf: Uint8Array, offset: number): number {
  const b0 = buf[offset] ?? 0;
  const b1 = buf[offset + 1] ?? 0;
  const b2 = buf[offset + 2] ?? 0;
  const b3 = buf[offset + 3] ?? 0;
  const raw = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
  return raw >= 0x80000000 ? raw - 0x100000000 : raw;
}

// ─── Namestr record ───────────────────────────────────────────────────────────

interface NamestrRecord {
  ntype: number; // 1=numeric, 2=char
  nname: string; // 8-char variable name
  nlabel: string; // 40-char variable label
  nfl: number; // format field length
  npos: number; // byte position in observation record
}

function parseNamestr(buf: Uint8Array, offset: number): NamestrRecord {
  return {
    ntype: readInt16(buf, offset + 0),
    nname: decodeAscii(buf, offset + 4, 8),
    nlabel: decodeAscii(buf, offset + 12, 40),
    nfl: readInt16(buf, offset + 52),
    npos: readInt32(buf, offset + 84),
  };
}

// ─── Header scan helpers ──────────────────────────────────────────────────────

/**
 * Find the offset of `magic` in `buf` starting from `start`.
 * Scans in 80-byte record increments.  Returns -1 if not found.
 */
function findRecord(buf: Uint8Array, magic: string, start: number): number {
  const magicLen = magic.length;
  for (let i = start; i + magicLen <= buf.length; i += RECORD_SIZE) {
    let match = true;
    for (let k = 0; k < magicLen; k++) {
      if ((buf[i + k] ?? 0) !== magic.charCodeAt(k)) {
        match = false;
        break;
      }
    }
    if (match) {
      return i;
    }
  }
  return -1;
}

// ─── readSas ──────────────────────────────────────────────────────────────────

/**
 * Read a SAS XPORT (Version 5) file and return a {@link DataFrame}.
 *
 * @param data  Raw file contents as a `Uint8Array` or ASCII `string`.
 * @param options  Optional reader configuration.
 * @returns A `DataFrame` with one column per SAS variable.
 *
 * @example
 * ```ts
 * import { readSas } from "tsb";
 *
 * // Minimal two-row XPORT file created programmatically
 * const df = readSas(xptBuffer);
 * df.shape; // [2, 3]
 * ```
 */
export function readSas(data: Uint8Array | string, options?: ReadSasOptions): DataFrame {
  const buf: Uint8Array =
    typeof data === "string"
      ? new Uint8Array(data.split("").map((c) => c.charCodeAt(0) & 0xff))
      : data;

  // ── 1. Find and validate library header ──────────────────────────────────
  const libOffset = findRecord(buf, HEADER_MAGIC_LIBRARY, 0);
  if (libOffset === -1) {
    throw new Error("readSas: not a valid SAS XPORT file (library header not found)");
  }

  // ── 2. Find member header ────────────────────────────────────────────────
  // The member header starts at libOffset + 5*80 (library header occupies 5 records).
  const memberOffset = findRecord(buf, HEADER_MAGIC_MEMBER, libOffset + RECORD_SIZE);
  if (memberOffset === -1) {
    throw new Error("readSas: member header not found");
  }

  // ── 3. Find namestr header and parse nvar ────────────────────────────────
  const namestrHdrOffset = findRecord(buf, HEADER_MAGIC_NAMESTR, memberOffset + RECORD_SIZE);
  if (namestrHdrOffset === -1) {
    throw new Error("readSas: namestr header not found");
  }

  // The namestr header encodes nvar in the 16 chars starting at position 48.
  // Example: "...000000003000000000000000000000  " where 3 is nvar (6-digit right-padded).
  const nvarStr = decodeAscii(buf, namestrHdrOffset + HEADER_MAGIC_NAMESTR.length, 6).trim();
  const nvar = nvarStr === "" ? 0 : Number.parseInt(nvarStr, 10);
  if (!Number.isFinite(nvar) || nvar < 0) {
    throw new Error(`readSas: invalid variable count in namestr header: "${nvarStr}"`);
  }

  // ── 4. Parse namestr records ─────────────────────────────────────────────
  const namestrDataStart = namestrHdrOffset + RECORD_SIZE;
  const namestrTotalBytes = nvar * NAMESTR_SIZE;
  const namestrs: NamestrRecord[] = [];
  for (let i = 0; i < nvar; i++) {
    namestrs.push(parseNamestr(buf, namestrDataStart + i * NAMESTR_SIZE));
  }

  // ── 5. Find obs header ───────────────────────────────────────────────────
  // Namestr records are padded to next 80-byte boundary.
  const namestrPadded = Math.ceil(namestrTotalBytes / RECORD_SIZE) * RECORD_SIZE;
  const obsSearchStart = namestrDataStart + namestrPadded;
  const obsHdrOffset = findRecord(buf, HEADER_MAGIC_OBS, obsSearchStart);
  if (obsHdrOffset === -1) {
    throw new Error("readSas: obs header not found");
  }

  // ── 6. Calculate observation record length ───────────────────────────────
  let rowLen = 0;
  for (const ns of namestrs) {
    rowLen = Math.max(rowLen, ns.npos + ns.nfl);
  }
  // Round up to 80-byte boundary.
  const paddedRowLen = rowLen === 0 ? RECORD_SIZE : Math.ceil(rowLen / RECORD_SIZE) * RECORD_SIZE;

  // ── 7. Read observations ─────────────────────────────────────────────────
  const dataStart = obsHdrOffset + RECORD_SIZE;
  const dataBytes = buf.length - dataStart;
  const nrows = paddedRowLen > 0 ? Math.floor(dataBytes / paddedRowLen) : 0;

  // Build column arrays.
  const columns: Map<string, (number | string | null)[]> = new Map();
  for (const ns of namestrs) {
    columns.set(ns.nname, []);
  }

  for (let row = 0; row < nrows; row++) {
    const rowStart = dataStart + row * paddedRowLen;
    for (const ns of namestrs) {
      const col = columns.get(ns.nname);
      if (col === undefined) {
        continue;
      }
      const fieldOffset = rowStart + ns.npos;
      if (ns.ntype === NTYPE_NUMERIC) {
        const val = ibmToDouble(buf, fieldOffset);
        col.push(Number.isNaN(val) ? null : val);
      } else if (ns.ntype === NTYPE_CHAR) {
        col.push(decodeAscii(buf, fieldOffset, ns.nfl));
      } else {
        col.push(null);
      }
    }
  }

  // ── 8. Build DataFrame ───────────────────────────────────────────────────
  if (namestrs.length === 0 || nrows === 0) {
    return DataFrame.fromRecords([]);
  }

  // Build a plain record of arrays for DataFrame.fromColumns.
  const colArrays: Record<string, readonly (number | string | null)[]> = {};
  for (const ns of namestrs) {
    const col = columns.get(ns.nname);
    if (col !== undefined) {
      colArrays[ns.nname] = col;
    }
  }

  const indexCol = options?.index ?? null;

  if (indexCol !== null && indexCol in colArrays) {
    // Build a DataFrame with the index column present, then promote it.
    const df = DataFrame.fromColumns(colArrays);
    return df.setIndex(indexCol, true);
  }

  return DataFrame.fromColumns(colArrays);
}
