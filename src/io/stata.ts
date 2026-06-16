/**
 * readStata / toStata — Stata DTA file I/O for DataFrame.
 *
 * Mirrors `pandas.read_stata()` and `DataFrame.to_stata()`:
 * - `readStata(data, options?)` — parse a Stata DTA binary buffer into a DataFrame
 * - `toStata(df, options?)` — serialize a DataFrame to a Stata DTA binary buffer
 *
 * Supported DTA versions:
 * - Reading: v114/v115 (old binary format, auto-detects byte order)
 * - Reading: v117/v118/v119 (new XML-tagged format, auto-detects byte order)
 * - Writing: v118 (new format, little-endian)
 *
 * Column types handled:
 * - byte (int8), int (int16), long (int32), float (float32), double (float64)
 * - str1..str2045 (fixed-width strings), strl (long strings, v117+)
 * - Missing values → `null`
 * - Value labels optionally applied with `convertCategoricals: true`
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── Public Types ─────────────────────────────────────────────────────────────

/** Options for {@link readStata}. */
export interface ReadStataOptions {
  /**
   * Column name or 0-based index to use as the row index.
   * Default: `null` (RangeIndex).
   */
  readonly indexCol?: string | number | null;
  /** Maximum number of data rows to read. Default: unlimited. */
  readonly nRows?: number;
  /**
   * Apply value labels to integer columns that have them, replacing
   * numeric codes with their string labels. Default: `false`.
   */
  readonly convertCategoricals?: boolean;
  /**
   * Only include these column names. `null` = all columns.
   * Default: `null`.
   */
  readonly usecols?: readonly string[] | null;
}

/** Options for {@link toStata}. */
export interface ToStataOptions {
  /** Dataset label (up to 80 characters). Default: `""`. */
  readonly dataLabel?: string;
  /**
   * Write the DataFrame's row index as a column named `"_index"`.
   * Default: `false`.
   */
  readonly writeIndex?: boolean;
  /**
   * Map of column name → variable label (up to 80 characters).
   * Default: `{}`.
   */
  readonly variableLabels?: Readonly<Record<string, string>>;
}

// ─── Internal Types ───────────────────────────────────────────────────────────

/** Column descriptor parsed from a DTA file. */
interface ColDesc {
  readonly name: string;
  /** Raw Stata type code. */
  readonly code: number;
  /** Byte width of this column in the data section. */
  readonly width: number;
  /** True if this column holds a strl reference (v117+). */
  readonly isStrl: boolean;
}

/** Internal representation of a fully parsed DTA file. */
interface DtaData {
  readonly cols: ColDesc[];
  readonly rows: Scalar[][];
  readonly lblNames: string[];
  readonly varLabels: string[];
  readonly valueLabels: Map<string, Map<number, string>>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** New-format (v117+) numeric type codes. */
const TC_DOUBLE = 65526;
const TC_FLOAT = 65527;
const TC_LONG = 65528;
const TC_INT = 65529;
const TC_BYTE = 65530;
const TC_STRL = 32768;

/** Missing-value sentinels for integer types. */
const MISS_BYTE = 101; // int8 >= 101 is missing
const MISS_INT = 32741; // int16 >= 32741 is missing
const MISS_LONG = 2147483621; // int32 >= 2147483621 is missing

/** Stata float missing: bit pattern 0x7f000000 or higher. */
const MISS_F32_BITS = 0x7f000000;
/** Stata double missing: high-32-bit pattern 0x7fe00000 or higher. */
const MISS_F64_HI = 0x7fe00000;
/** Stata double missing written as uint32 pair (LE). */
const MISS_F64_LO32 = 0x00000000;
const MISS_F64_HI32 = 0x7fe00000;

// ─── Missing Value Helpers ────────────────────────────────────────────────────

function isMissF32(view: DataView, pos: number, le: boolean): boolean {
  return view.getUint32(pos, le) >= MISS_F32_BITS;
}

function isMissF64(view: DataView, pos: number, le: boolean): boolean {
  const hiOff = le ? pos + 4 : pos;
  return view.getUint32(hiOff, le) >= MISS_F64_HI;
}

// ─── Text Codecs ──────────────────────────────────────────────────────────────

const ENC = new TextEncoder();
const LATIN1 = new TextDecoder("latin1");
const UTF8D = new TextDecoder("utf-8");

// ─── BinReader ────────────────────────────────────────────────────────────────

class BinReader {
  pos = 0;
  /** Byte order: `true` = little-endian, `false` = big-endian. Mutable. */
  le: boolean;
  private readonly view: DataView;
  readonly u8: Uint8Array;

  constructor(data: Uint8Array | ArrayBuffer, le = true) {
    if (data instanceof ArrayBuffer) {
      this.u8 = new Uint8Array(data);
      this.view = new DataView(data);
    } else {
      this.u8 = data;
      this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    }
    this.le = le;
  }

  seek(p: number): void {
    this.pos = p;
  }

  skip(n: number): void {
    this.pos += n;
  }

  readU8(): number {
    return this.view.getUint8(this.pos++);
  }

  readI8(): number {
    return this.view.getInt8(this.pos++);
  }

  readU16(): number {
    const v = this.view.getUint16(this.pos, this.le);
    this.pos += 2;
    return v;
  }

  readI16(): number {
    const v = this.view.getInt16(this.pos, this.le);
    this.pos += 2;
    return v;
  }

  readU32(): number {
    const v = this.view.getUint32(this.pos, this.le);
    this.pos += 4;
    return v;
  }

  readI32(): number {
    const v = this.view.getInt32(this.pos, this.le);
    this.pos += 4;
    return v;
  }

  readF32(): number {
    const v = this.view.getFloat32(this.pos, this.le);
    this.pos += 4;
    return v;
  }

  readF64(): number {
    const v = this.view.getFloat64(this.pos, this.le);
    this.pos += 8;
    return v;
  }

  /** Read uint64 as a JS number (safe for values ≤ 2^53). */
  readU64(): number {
    const a = this.view.getUint32(this.pos, this.le);
    const b = this.view.getUint32(this.pos + 4, this.le);
    this.pos += 8;
    return this.le ? a + b * 4294967296 : b + a * 4294967296;
  }

  readBytes(n: number): Uint8Array {
    const s = this.u8.subarray(this.pos, this.pos + n);
    this.pos += n;
    return s;
  }

  /** Read a fixed-width field as a null-terminated Latin-1 string. */
  readCStr(fieldLen: number): string {
    const b = this.readBytes(fieldLen);
    let end = 0;
    while (end < b.length && (b[end] ?? 0) !== 0) {
      end++;
    }
    return LATIN1.decode(b.subarray(0, end));
  }

  /** Read a fixed-width field, trim trailing null bytes and spaces. */
  readTrimStr(fieldLen: number): string {
    const b = this.readBytes(fieldLen);
    let end = b.length;
    while (end > 0 && ((b[end - 1] ?? 0) === 0 || (b[end - 1] ?? 0) === 0x20)) {
      end--;
    }
    return LATIN1.decode(b.subarray(0, end));
  }

  /** Read and verify an ASCII tag. Throws on mismatch. */
  expectTag(tag: string): void {
    const tb = ENC.encode(tag);
    for (let i = 0; i < tb.length; i++) {
      if ((this.u8[this.pos + i] ?? -1) !== (tb[i] ?? 0)) {
        const got = LATIN1.decode(this.u8.subarray(this.pos, this.pos + tb.length));
        throw new Error(`Stata DTA: expected "${tag}", got "${got}" at offset ${this.pos}`);
      }
    }
    this.pos += tb.length;
  }

  /** Scan forward until the given ASCII tag is found and consumed. */
  skipToTag(tag: string): void {
    const tb = ENC.encode(tag);
    const len = tb.length;
    for (let i = this.pos; i + len <= this.u8.length; i++) {
      let ok = true;
      for (let j = 0; j < len; j++) {
        if (this.u8[i + j] !== tb[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        this.pos = i + len;
        return;
      }
    }
    throw new Error(`Stata DTA: tag "${tag}" not found`);
  }

  get dataView(): DataView {
    return this.view;
  }
}

// ─── BinWriter ────────────────────────────────────────────────────────────────

class BinWriter {
  private buf: Uint8Array;
  private _pos = 0;
  private view: DataView;
  readonly le: boolean;

  constructor(capacity = 8192, le = true) {
    this.buf = new Uint8Array(capacity);
    this.view = new DataView(this.buf.buffer);
    this.le = le;
  }

  get pos(): number {
    return this._pos;
  }

  private grow(need: number): void {
    if (this._pos + need <= this.buf.length) return;
    let next = this.buf.length * 2;
    while (this._pos + need > next) next *= 2;
    const nb = new Uint8Array(next);
    nb.set(this.buf.subarray(0, this._pos));
    this.buf = nb;
    this.view = new DataView(nb.buffer);
  }

  writeU8(v: number): void {
    this.grow(1);
    this.view.setUint8(this._pos++, v);
  }

  writeI8(v: number): void {
    this.grow(1);
    this.view.setInt8(this._pos++, v);
  }

  writeU16(v: number): void {
    this.grow(2);
    this.view.setUint16(this._pos, v, this.le);
    this._pos += 2;
  }

  writeI16(v: number): void {
    this.grow(2);
    this.view.setInt16(this._pos, v, this.le);
    this._pos += 2;
  }

  writeU32(v: number): void {
    this.grow(4);
    this.view.setUint32(this._pos, v, this.le);
    this._pos += 4;
  }

  writeI32(v: number): void {
    this.grow(4);
    this.view.setInt32(this._pos, v, this.le);
    this._pos += 4;
  }

  writeF32(v: number): void {
    this.grow(4);
    this.view.setFloat32(this._pos, v, this.le);
    this._pos += 4;
  }

  writeF64(v: number): void {
    this.grow(8);
    this.view.setFloat64(this._pos, v, this.le);
    this._pos += 8;
  }

  writeU64(v: number): void {
    this.grow(8);
    const lo = v >>> 0;
    const hi = Math.floor(v / 4294967296) >>> 0;
    if (this.le) {
      this.view.setUint32(this._pos, lo, true);
      this.view.setUint32(this._pos + 4, hi, true);
    } else {
      this.view.setUint32(this._pos, hi, false);
      this.view.setUint32(this._pos + 4, lo, false);
    }
    this._pos += 8;
  }

  /** Overwrite a previously-written uint64 value at `offset`. */
  patchU64(offset: number, v: number): void {
    const lo = v >>> 0;
    const hi = Math.floor(v / 4294967296) >>> 0;
    if (this.le) {
      this.view.setUint32(offset, lo, true);
      this.view.setUint32(offset + 4, hi, true);
    } else {
      this.view.setUint32(offset, hi, false);
      this.view.setUint32(offset + 4, lo, false);
    }
  }

  writeBytes(b: Uint8Array): void {
    this.grow(b.length);
    this.buf.set(b, this._pos);
    this._pos += b.length;
  }

  writeAscii(s: string): void {
    this.writeBytes(ENC.encode(s));
  }

  /** Write a null-padded fixed-length ASCII field of exactly `fieldLen` bytes. */
  writeFixed(s: string, fieldLen: number): void {
    this.grow(fieldLen);
    const b = ENC.encode(s);
    const n = Math.min(b.length, fieldLen);
    for (let i = 0; i < n; i++) this.view.setUint8(this._pos + i, b[i] ?? 0);
    for (let i = n; i < fieldLen; i++) this.view.setUint8(this._pos + i, 0);
    this._pos += fieldLen;
  }

  finalize(): Uint8Array {
    return this.buf.slice(0, this._pos);
  }
}

// ─── Old Format Parser (v114/v115) ────────────────────────────────────────────

function parseOldFormat(u8: Uint8Array, version: number): DtaData {
  const byteOrderCode = u8[1] ?? 2;
  const le = byteOrderCode === 2; // 2 = LOHI (little-endian), 1 = HILO (big-endian)
  const r = new BinReader(u8, le);

  r.skip(4); // ds_format, byte_order, filetype, padding
  const nvar = r.readU16();
  const nobs = r.readU32();
  r.readCStr(81); // data_label (ignored)
  r.readCStr(18); // time_stamp (ignored)
  // offset = 109

  // typlist: 1 byte per column
  const stataTypes: number[] = [];
  for (let i = 0; i < nvar; i++) stataTypes.push(r.readU8());

  // varlist
  const colSize = version > 113 ? 33 : 10;
  const names: string[] = [];
  for (let i = 0; i < nvar; i++) names.push(r.readCStr(colSize));

  // srtlist (skip)
  r.skip((nvar + 1) * 2);

  // fmtlist (skip)
  const fmtSize = version > 113 ? 49 : 13;
  r.skip(nvar * fmtSize);

  // lbllist (value label names)
  const lblSize = version > 113 ? 33 : 10;
  const lblNames: string[] = [];
  for (let i = 0; i < nvar; i++) lblNames.push(r.readCStr(lblSize));

  // variable_labels
  const varLabels: string[] = [];
  for (let i = 0; i < nvar; i++) varLabels.push(r.readCStr(81));

  // characteristics: skip until end marker (type == 0)
  while (r.pos + 2 < u8.length) {
    const chType = r.readU16();
    if (chType === 0) break;
    r.skip(colSize); // varname
    r.skip(colSize); // charname
    const len = r.readU32();
    r.skip(len);
  }

  // Build column descriptors
  const cols: ColDesc[] = [];
  for (let i = 0; i < nvar; i++) {
    const t = stataTypes[i] ?? 255;
    let width: number;
    if (t <= 244) {
      width = t; // str
    } else if (t === 251) {
      width = 1; // byte
    } else if (t === 252) {
      width = 2; // int
    } else if (t === 253 || t === 254) {
      width = 4; // long or float
    } else {
      width = 8; // double (255) or unknown
    }
    cols.push({ name: names[i] ?? `var${i}`, code: t, width, isStrl: false });
  }

  // Read data rows
  const dv = r.dataView;
  const rows: Scalar[][] = [];
  for (let row = 0; row < nobs; row++) {
    const rowData: Scalar[] = [];
    for (const col of cols) {
      const t = col.code;
      if (t <= 244) {
        rowData.push(r.readTrimStr(t));
      } else if (t === 251) {
        // byte (int8): missing if >= MISS_BYTE
        const v = r.readI8();
        rowData.push(v >= MISS_BYTE ? null : v);
      } else if (t === 252) {
        // int (int16): missing if >= MISS_INT
        const v = r.readI16();
        rowData.push(v >= MISS_INT ? null : v);
      } else if (t === 253) {
        // long (int32): missing if >= MISS_LONG
        const v = r.readI32();
        rowData.push(v >= MISS_LONG ? null : v);
      } else if (t === 254) {
        // float (float32): check bit pattern
        const missing = isMissF32(dv, r.pos, le);
        const v = r.readF32();
        rowData.push(missing ? null : v);
      } else {
        // double (float64): check bit pattern
        const missing = isMissF64(dv, r.pos, le);
        const v = r.readF64();
        rowData.push(missing ? null : v);
      }
    }
    rows.push(rowData);
  }

  const valueLabels = parseOldValueLabels(r, version);
  return { cols, rows, lblNames, varLabels, valueLabels };
}

function parseOldValueLabels(r: BinReader, version: number): Map<string, Map<number, string>> {
  const result = new Map<string, Map<number, string>>();
  const lblSize = version > 113 ? 33 : 10;

  while (r.pos + lblSize + 11 < r.u8.length) {
    const labname = r.readCStr(lblSize);
    r.skip(3); // padding
    const n = r.readU32();
    const txtlen = r.readU32();
    if (labname.length === 0 || n === 0 || txtlen === 0) break;
    if (r.pos + n * 8 + txtlen > r.u8.length) break;

    const offsets: number[] = [];
    for (let i = 0; i < n; i++) offsets.push(r.readU32());
    const values: number[] = [];
    for (let i = 0; i < n; i++) values.push(r.readI32());
    const txt = r.readBytes(txtlen);

    const map = new Map<number, string>();
    for (let i = 0; i < n; i++) {
      const off = offsets[i] ?? 0;
      let end = off;
      while (end < txt.length && (txt[end] ?? 0) !== 0) end++;
      const label = LATIN1.decode(txt.subarray(off, end));
      const val = values[i];
      if (val !== undefined) map.set(val, label);
    }
    result.set(labname, map);
  }
  return result;
}

// ─── New Format Parser (v117/v118/v119) ───────────────────────────────────────

function parseNewFormat(u8: Uint8Array, version: number): DtaData {
  const r = new BinReader(u8, true); // initially LE; updated after reading byteorder

  r.expectTag("<stata_dta>");
  r.expectTag("<header>");
  r.expectTag("<release>");
  r.skip(3); // 3-byte ASCII version string
  r.expectTag("</release>");
  r.expectTag("<byteorder>");
  const bo = LATIN1.decode(r.readBytes(3));
  r.le = bo !== "MSF"; // "LSF" = little-endian, "MSF" = big-endian
  r.expectTag("</byteorder>");
  r.expectTag("<K>");
  const nvar = r.readU16();
  r.expectTag("</K>");
  r.expectTag("<N>");
  const nobs = version >= 119 ? r.readU64() : r.readU32();
  r.expectTag("</N>");
  r.expectTag("<label>");
  const labelLen = version > 117 ? r.readU16() : r.readU8();
  r.skip(labelLen);
  r.expectTag("</label>");
  r.expectTag("<timestamp>");
  const tsLen = version > 117 ? r.readU16() : r.readU8();
  r.skip(tsLen);
  r.expectTag("</timestamp>");
  r.expectTag("</header>");

  // Map: 14 × uint64 file offsets
  r.expectTag("<map>");
  const mapOff: number[] = [];
  for (let i = 0; i < 14; i++) mapOff.push(r.readU64());
  r.expectTag("</map>");

  // variable_types
  const seekVT = mapOff[2] ?? 0;
  if (seekVT > 0) r.seek(seekVT);
  r.expectTag("<variable_types>");
  const varCodes: number[] = [];
  for (let i = 0; i < nvar; i++) varCodes.push(r.readU16());
  r.expectTag("</variable_types>");

  // varnames
  const seekVN = mapOff[3] ?? 0;
  if (seekVN > 0) r.seek(seekVN);
  r.expectTag("<varnames>");
  const varNameLen = version >= 119 ? 129 : 33;
  const names: string[] = [];
  for (let i = 0; i < nvar; i++) names.push(r.readCStr(varNameLen));
  r.expectTag("</varnames>");

  // value_label_names (skip sortlist and formats)
  const seekVLN = mapOff[6] ?? 0;
  if (seekVLN > 0) r.seek(seekVLN);
  r.expectTag("<value_label_names>");
  const vlNameLen = version >= 119 ? 129 : 33;
  const lblNames: string[] = [];
  for (let i = 0; i < nvar; i++) lblNames.push(r.readCStr(vlNameLen));
  r.expectTag("</value_label_names>");

  // variable_labels
  const seekVL = mapOff[7] ?? 0;
  if (seekVL > 0) r.seek(seekVL);
  r.expectTag("<variable_labels>");
  const varLabels: string[] = [];
  for (let i = 0; i < nvar; i++) varLabels.push(r.readCStr(81));
  r.expectTag("</variable_labels>");

  // Build column descriptors
  const cols: ColDesc[] = [];
  for (let i = 0; i < nvar; i++) {
    const code = varCodes[i] ?? TC_DOUBLE;
    let width: number;
    let isStrl = false;
    if (code <= 2045) {
      width = code; // str (fixed string of that length)
    } else if (code === TC_STRL) {
      // strl reference: uint16 v + uint32 o (v117) or uint64 o (v118+)
      width = version >= 118 ? 10 : 6;
      isStrl = true;
    } else if (code === TC_BYTE) {
      width = 1;
    } else if (code === TC_INT) {
      width = 2;
    } else if (code === TC_LONG || code === TC_FLOAT) {
      width = 4;
    } else {
      width = 8; // TC_DOUBLE or unknown
    }
    cols.push({ name: names[i] ?? `var${i}`, code, width, isStrl });
  }

  // Read strls section if any strl columns exist
  const strlMap = new Map<string, string>(); // "v,o" → string value
  const seekST = mapOff[10] ?? 0;
  if (seekST > 0 && cols.some((c) => c.isStrl)) {
    r.seek(seekST);
    r.expectTag("<strls>");
    while (r.pos + 3 <= r.u8.length) {
      if ((r.u8[r.pos] ?? 0) === 0x3c) break; // '<' = start of </strls>
      // Check for "GSO" magic
      if (
        (r.u8[r.pos] ?? 0) !== 0x47 ||
        (r.u8[r.pos + 1] ?? 0) !== 0x53 ||
        (r.u8[r.pos + 2] ?? 0) !== 0x4f
      ) {
        break;
      }
      r.skip(3); // "GSO"
      const gsoV = r.readU16();
      const gsoO = version >= 118 ? r.readU64() : r.readU32();
      const t = r.readU8(); // 129=binary, 130=string
      const len = r.readU32();
      const data = r.readBytes(len);
      if (t === 130) {
        // string: null-terminated UTF-8
        let end = 0;
        while (end < data.length && (data[end] ?? 0) !== 0) end++;
        strlMap.set(`${gsoV},${gsoO}`, UTF8D.decode(data.subarray(0, end)));
      }
    }
    r.skipToTag("</strls>");
  }

  // Read data section
  const seekDA = mapOff[9] ?? 0;
  if (seekDA > 0) r.seek(seekDA);
  r.expectTag("<data>");
  const dv = r.dataView;
  const rows: Scalar[][] = [];
  for (let row = 0; row < nobs; row++) {
    const rowData: Scalar[] = [];
    for (const col of cols) {
      const code = col.code;
      if (code <= 2045) {
        rowData.push(r.readTrimStr(code));
      } else if (col.isStrl) {
        const gv = r.readU16();
        const go = version >= 118 ? r.readU64() : r.readU32();
        rowData.push(strlMap.get(`${gv},${go}`) ?? null);
      } else if (code === TC_BYTE) {
        const v = r.readI8();
        rowData.push(v >= MISS_BYTE ? null : v);
      } else if (code === TC_INT) {
        const v = r.readI16();
        rowData.push(v >= MISS_INT ? null : v);
      } else if (code === TC_LONG) {
        const v = r.readI32();
        rowData.push(v >= MISS_LONG ? null : v);
      } else if (code === TC_FLOAT) {
        const missing = isMissF32(dv, r.pos, r.le);
        const v = r.readF32();
        rowData.push(missing ? null : v);
      } else {
        // TC_DOUBLE
        const missing = isMissF64(dv, r.pos, r.le);
        const v = r.readF64();
        rowData.push(missing ? null : v);
      }
    }
    rows.push(rowData);
  }
  r.expectTag("</data>");

  // Value labels
  const seekVA = mapOff[11] ?? 0;
  if (seekVA > 0) r.seek(seekVA);
  const valueLabels = parseNewValueLabels(r, version);
  return { cols, rows, lblNames, varLabels, valueLabels };
}

function parseNewValueLabels(r: BinReader, version: number): Map<string, Map<number, string>> {
  const result = new Map<string, Map<number, string>>();
  const lblSize = version >= 119 ? 129 : 33;

  r.expectTag("<value_labels>");
  while (r.pos + 5 < r.u8.length) {
    if ((r.u8[r.pos] ?? 0) === 0x3c && (r.u8[r.pos + 1] ?? 0) === 0x2f) break; // "</"
    r.expectTag("<lbl>");
    r.readU32(); // total byte length (informational)
    const labname = r.readCStr(lblSize);
    r.skip(3); // padding
    const n = r.readU32();
    const txtlen = r.readU32();
    const offsets: number[] = [];
    for (let i = 0; i < n; i++) offsets.push(r.readU32());
    const values: number[] = [];
    for (let i = 0; i < n; i++) values.push(r.readI32());
    const txt = r.readBytes(txtlen);
    r.expectTag("</lbl>");

    if (labname.length > 0 && n > 0) {
      const map = new Map<number, string>();
      for (let i = 0; i < n; i++) {
        const off = offsets[i] ?? 0;
        let end = off;
        while (end < txt.length && (txt[end] ?? 0) !== 0) end++;
        const label = UTF8D.decode(txt.subarray(off, end));
        const val = values[i];
        if (val !== undefined) map.set(val, label);
      }
      result.set(labname, map);
    }
  }
  return result;
}

// ─── DataFrame Builder ────────────────────────────────────────────────────────

function isLabel(v: Scalar): v is Label {
  return (
    v === null ||
    typeof v === "number" ||
    typeof v === "string" ||
    typeof v === "boolean" ||
    v instanceof Date
  );
}

function buildDataFrame(data: DtaData, opts: ReadStataOptions): DataFrame {
  const { cols, rows, lblNames, valueLabels } = data;
  const { indexCol = null, nRows, convertCategoricals = false, usecols = null } = opts;
  const limit = nRows !== undefined ? Math.min(nRows, rows.length) : rows.length;

  // Determine active column indices
  let activeIdx = cols.map((_, i) => i);
  if (usecols !== null) {
    const keep = new Set(usecols);
    activeIdx = activeIdx.filter((i) => keep.has(cols[i]?.name ?? ""));
  }

  // Build column arrays from rows
  const arrays: Scalar[][] = activeIdx.map(() => []);
  for (let ri = 0; ri < limit; ri++) {
    const row = rows[ri];
    if (row === undefined) continue;
    for (let ci = 0; ci < activeIdx.length; ci++) {
      const colIdx = activeIdx[ci] ?? 0;
      (arrays[ci] ?? []).push(row[colIdx] ?? null);
    }
  }

  // Apply value labels (convertCategoricals)
  if (convertCategoricals) {
    for (let ci = 0; ci < activeIdx.length; ci++) {
      const colIdx = activeIdx[ci] ?? 0;
      const lblName = lblNames[colIdx] ?? "";
      if (lblName.length === 0) continue;
      const lblMap = valueLabels.get(lblName);
      if (lblMap === undefined) continue;
      const arr = arrays[ci];
      if (arr === undefined) continue;
      for (let ri = 0; ri < arr.length; ri++) {
        const v = arr[ri];
        if (typeof v === "number") {
          const label = lblMap.get(v);
          if (label !== undefined) arr[ri] = label;
        }
      }
    }
  }

  // Build column data record
  const colData: Record<string, Scalar[]> = {};
  for (let ci = 0; ci < activeIdx.length; ci++) {
    const colIdx = activeIdx[ci] ?? 0;
    colData[cols[colIdx]?.name ?? `var${colIdx}`] = arrays[ci] ?? [];
  }

  // Handle indexCol
  let idxName: string | null = null;
  if (typeof indexCol === "string") {
    idxName = indexCol;
  } else if (typeof indexCol === "number") {
    const mapped = activeIdx[indexCol];
    if (mapped !== undefined) idxName = cols[mapped]?.name ?? null;
  }

  if (idxName !== null && idxName in colData) {
    const idxData = (colData[idxName] ?? []).filter(isLabel);
    const rest: Record<string, Scalar[]> = {};
    for (const [k, v] of Object.entries(colData)) {
      if (k !== idxName) rest[k] = v;
    }
    return DataFrame.fromColumns(rest, { index: new Index(idxData) });
  }

  return DataFrame.fromColumns(colData);
}

// ─── readStata ────────────────────────────────────────────────────────────────

/**
 * Parse a Stata DTA file into a {@link DataFrame}.
 *
 * Supports DTA versions 114/115 (old binary format) and 117/118/119
 * (new XML-tagged format). Numeric missing values are represented as `null`.
 *
 * @example
 * ```ts
 * import { readStata } from "tsb";
 * const buf = await Bun.file("data.dta").arrayBuffer();
 * const df = readStata(buf);
 * df.shape;              // [nobs, nvar]
 * df.columns.toArray();  // ["age", "income", ...]
 * ```
 */
export function readStata(
  data: Uint8Array | ArrayBuffer,
  options: ReadStataOptions = {},
): DataFrame {
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (u8.length < 4) throw new Error("Stata DTA: buffer too small");

  let parsed: DtaData;
  const firstByte = u8[0] ?? 0;

  if (firstByte === 0x3c) {
    // New format: starts with "<stata_dta>"
    const header100 = LATIN1.decode(u8.subarray(0, Math.min(100, u8.length)));
    const m = /<release>(\d+)<\/release>/.exec(header100);
    const version = m?.[1] !== undefined ? Number.parseInt(m[1], 10) : 118;
    parsed = parseNewFormat(u8, version);
  } else {
    // Old binary format: first byte is the version number
    const version = firstByte;
    if (version < 104 || version > 115) {
      throw new Error(`Stata DTA: unsupported version byte ${version}`);
    }
    parsed = parseOldFormat(u8, version);
  }

  return buildDataFrame(parsed, options);
}

// ─── toStata ─────────────────────────────────────────────────────────────────

/**
 * Serialize a {@link DataFrame} to a Stata DTA v118 binary file.
 *
 * Column type mapping:
 * - `number` → `double` (float64)
 * - `boolean` → `byte` (int8, stored as 0/1)
 * - `string` → `str` (fixed-width, up to 2045 bytes; longer strings truncated)
 * - `null` / `undefined` → Stata missing value for the column's type
 *
 * @example
 * ```ts
 * import { DataFrame, toStata } from "tsb";
 * const df = DataFrame.fromColumns({
 *   age: [25, 30, null],
 *   name: ["Alice", "Bob", "Carol"],
 * });
 * const buf = toStata(df);
 * await Bun.write("data.dta", buf);
 * ```
 */
export function toStata(df: DataFrame, options: ToStataOptions = {}): Uint8Array {
  const { dataLabel = "", writeIndex = false, variableLabels = {} } = options;

  // Collect columns
  const colNames: string[] = [];
  const colArrays: Scalar[][] = [];

  if (writeIndex) {
    colNames.push("_index");
    colArrays.push([...df.index.toArray()]);
  }
  for (const name of df.columns.values) {
    colNames.push(name);
    colArrays.push([...df.col(name).toArray()]);
  }

  const nvar = colNames.length;
  const nobs = df.shape[0];

  // Determine Stata type for each column
  const stataTypes: number[] = [];
  for (let ci = 0; ci < nvar; ci++) {
    const arr = colArrays[ci] ?? [];
    let hasStr = false;
    let maxStrLen = 0;
    let allBoolOrNum = true;
    let allBool = true;
    for (const v of arr) {
      if (v === null || v === undefined) continue;
      if (typeof v === "string") {
        hasStr = true;
        allBoolOrNum = false;
        allBool = false;
        const len = ENC.encode(v).length;
        if (len > maxStrLen) maxStrLen = len;
      } else if (typeof v !== "boolean") {
        allBool = false;
      }
    }
    if (hasStr) {
      stataTypes.push(Math.max(1, Math.min(maxStrLen, 2045)));
    } else if (allBool && allBoolOrNum) {
      stataTypes.push(TC_BYTE);
    } else {
      stataTypes.push(TC_DOUBLE);
    }
  }

  // Compute row width
  let rowWidth = 0;
  for (const t of stataTypes) {
    if (t <= 2045) rowWidth += t;
    else if (t === TC_BYTE) rowWidth += 1;
    else if (t === TC_INT) rowWidth += 2;
    else if (t === TC_LONG || t === TC_FLOAT) rowWidth += 4;
    else rowWidth += 8; // TC_DOUBLE
  }

  // Encode data label (UTF-8, max 80 bytes)
  const labelRaw = dataLabel.length > 80 ? dataLabel.slice(0, 80) : dataLabel;
  const labelBytes = ENC.encode(labelRaw);

  // Format timestamp: "dd Mon YYYY HH:MM" (always 17 bytes)
  const now = new Date();
  const mos = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const tsStr = [
    String(now.getUTCDate()).padStart(2, " "),
    mos[now.getUTCMonth()] ?? "Jan",
    String(now.getUTCFullYear()),
    `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`,
  ].join(" ");
  const tsBytes = ENC.encode(tsStr);

  const w = new BinWriter(65536);
  const mapSlots: number[] = []; // positions of each map uint64 in the output

  // Track offsets as we write sections
  const sectionOffs = new Array<number>(14).fill(0);
  sectionOffs[0] = 0; // <stata_dta>

  // ── <stata_dta> ──
  w.writeAscii("<stata_dta>");

  // ── <header> ──
  w.writeAscii("<header>");
  w.writeAscii("<release>118</release>");
  w.writeAscii("<byteorder>LSF</byteorder>");
  w.writeAscii("<K>");
  w.writeU16(nvar);
  w.writeAscii("</K>");
  w.writeAscii("<N>");
  w.writeU32(nobs);
  w.writeAscii("</N>");
  w.writeAscii("<label>");
  w.writeU16(labelBytes.length);
  w.writeBytes(labelBytes);
  w.writeAscii("</label>");
  w.writeAscii("<timestamp>");
  w.writeU16(tsBytes.length);
  w.writeBytes(tsBytes);
  w.writeAscii("</timestamp>");
  w.writeAscii("</header>");

  // ── <map> ──
  sectionOffs[1] = w.pos;
  w.writeAscii("<map>");
  const mapDataStart = w.pos; // position of first uint64 in map
  for (let i = 0; i < 14; i++) {
    mapSlots.push(mapDataStart + i * 8);
    w.writeU64(0); // placeholder
  }
  w.writeAscii("</map>");

  // ── <variable_types> ──
  sectionOffs[2] = w.pos;
  w.writeAscii("<variable_types>");
  for (const t of stataTypes) w.writeU16(t);
  w.writeAscii("</variable_types>");

  // ── <varnames> ──
  sectionOffs[3] = w.pos;
  w.writeAscii("<varnames>");
  for (const name of colNames) w.writeFixed(name.slice(0, 32), 33);
  w.writeAscii("</varnames>");

  // ── <sortlist> ──
  sectionOffs[4] = w.pos;
  w.writeAscii("<sortlist>");
  for (let i = 0; i <= nvar; i++) w.writeU16(0);
  w.writeAscii("</sortlist>");

  // ── <formats> ──
  sectionOffs[5] = w.pos;
  w.writeAscii("<formats>");
  for (let ci = 0; ci < nvar; ci++) {
    const t = stataTypes[ci] ?? TC_DOUBLE;
    let fmt: string;
    if (t <= 2045) {
      fmt = `%${t}s`;
    } else if (t === TC_BYTE || t === TC_INT) {
      fmt = "%8.0g";
    } else if (t === TC_LONG) {
      fmt = "%12.0g";
    } else if (t === TC_FLOAT) {
      fmt = "%9.0g";
    } else {
      fmt = "%10.0g"; // TC_DOUBLE
    }
    w.writeFixed(fmt, 57);
  }
  w.writeAscii("</formats>");

  // ── <value_label_names> ──
  sectionOffs[6] = w.pos;
  w.writeAscii("<value_label_names>");
  for (let i = 0; i < nvar; i++) w.writeFixed("", 33);
  w.writeAscii("</value_label_names>");

  // ── <variable_labels> ──
  sectionOffs[7] = w.pos;
  w.writeAscii("<variable_labels>");
  for (const name of colNames) {
    const lbl = variableLabels[name] ?? "";
    w.writeFixed(lbl.slice(0, 80), 81);
  }
  w.writeAscii("</variable_labels>");

  // ── <characteristics> (empty) ──
  sectionOffs[8] = w.pos;
  w.writeAscii("<characteristics>");
  w.writeAscii("</characteristics>");

  // ── <data> ──
  sectionOffs[9] = w.pos;
  w.writeAscii("<data>");
  for (let ri = 0; ri < nobs; ri++) {
    for (let ci = 0; ci < nvar; ci++) {
      const t = stataTypes[ci] ?? TC_DOUBLE;
      const v = (colArrays[ci] ?? [])[ri] ?? null;
      if (t <= 2045) {
        // str: write bytes then null-pad to field length
        const s = typeof v === "string" ? v : v !== null && v !== undefined ? String(v) : "";
        const sb = ENC.encode(s);
        const n = Math.min(sb.length, t);
        for (let j = 0; j < n; j++) w.writeU8(sb[j] ?? 0);
        for (let j = n; j < t; j++) w.writeU8(0);
      } else if (t === TC_BYTE) {
        if (v === null || v === undefined) {
          w.writeI8(MISS_BYTE);
        } else {
          const bv = typeof v === "boolean" ? (v ? 1 : 0) : Math.round(Number(v));
          w.writeI8(Math.max(-127, Math.min(100, bv)));
        }
      } else if (t === TC_INT) {
        if (v === null || v === undefined) {
          w.writeI16(MISS_INT);
        } else {
          w.writeI16(Math.max(-32767, Math.min(32740, Math.round(Number(v)))));
        }
      } else if (t === TC_LONG) {
        if (v === null || v === undefined) {
          w.writeI32(MISS_LONG);
        } else {
          w.writeI32(Math.max(-2147483647, Math.min(2147483620, Math.round(Number(v)))));
        }
      } else if (t === TC_FLOAT) {
        if (v === null || v === undefined) {
          w.writeU32(MISS_F32_BITS);
        } else {
          w.writeF32(Number(v));
        }
      } else {
        // TC_DOUBLE
        if (v === null || v === undefined) {
          // Write Stata double missing pattern (little-endian: low word first)
          w.writeU32(MISS_F64_LO32);
          w.writeU32(MISS_F64_HI32);
        } else {
          w.writeF64(Number(v));
        }
      }
    }
  }
  w.writeAscii("</data>");

  // ── <strls> (empty) ──
  sectionOffs[10] = w.pos;
  w.writeAscii("<strls>");
  w.writeAscii("</strls>");

  // ── <value_labels> (empty) ──
  sectionOffs[11] = w.pos;
  w.writeAscii("<value_labels>");
  w.writeAscii("</value_labels>");

  // ── </stata_dta> ──
  sectionOffs[12] = w.pos; // end-of-data marker
  w.writeAscii("</stata_dta>");

  // Patch the map with actual section offsets
  for (let i = 0; i < 14; i++) {
    const slotPos = mapSlots[i];
    if (slotPos !== undefined) {
      w.patchU64(slotPos, sectionOffs[i] ?? 0);
    }
  }

  return w.finalize();
}
