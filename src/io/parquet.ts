/**
 * readParquet / toParquet — Apache Parquet I/O for DataFrame.
 *
 * Mirrors `pandas.read_parquet()` and `DataFrame.to_parquet()`:
 * - `readParquet(data, options?)` — parse a Parquet binary buffer into a DataFrame
 * - `toParquet(df, options?)` — serialize a DataFrame to a Parquet binary buffer
 *
 * Supported physical types (read & write):
 * - INT32, INT64, DOUBLE, BOOLEAN, BYTE_ARRAY (UTF-8 strings)
 *
 * Encoding: PLAIN for all data pages.
 * Compression: UNCOMPRESSED only.
 * Repetition levels: flat tables only (no nested / repeated fields).
 * Definition levels: RLE-encoded (supports optional / nullable columns).
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Options for {@link readParquet}. */
export interface ReadParquetOptions {
  /**
   * Column name or 0-based index to use as the row index.
   * Default: `null` (RangeIndex).
   */
  readonly indexCol?: string | number | null;
  /** Maximum number of rows to read. Default: unlimited. */
  readonly nRows?: number;
  /**
   * Subset of column names to include. `null` = all columns.
   * Default: `null`.
   */
  readonly usecols?: readonly string[] | null;
}

/** Options for {@link toParquet}. */
export interface ToParquetOptions {
  /**
   * Write the DataFrame's row index as a column named `"__index_level_0__"`.
   * Default: `false`.
   */
  readonly writeIndex?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAGIC = new Uint8Array([0x50, 0x41, 0x52, 0x31]); // "PAR1"

// Thrift compact protocol type codes
const T_STOP = 0;
const T_BOOL_TRUE = 1;
const T_BOOL_FALSE = 2;
const T_I8 = 3;
const T_I16 = 4;
const T_I32 = 5;
const T_I64 = 6;
const T_DOUBLE = 7;
const T_BINARY = 8;
const T_LIST = 9;
const T_STRUCT = 12;

// Parquet physical types
const PHYS_BOOLEAN = 0;
const PHYS_INT32 = 1;
const PHYS_INT64 = 2;
const PHYS_FLOAT = 4;
const PHYS_DOUBLE = 5;
const PHYS_BYTE_ARRAY = 6;

// Parquet encodings
const ENC_PLAIN = 0;
const ENC_RLE = 3;

// Parquet page types
const PAGE_DATA = 0;

// Parquet repetition types
const REP_OPTIONAL = 1;
const REP_REQUIRED = 2;

// Parquet compression codecs
const CODEC_UNCOMPRESSED = 0;

// ─── Thrift compact reader ─────────────────────────────────────────────────────

class ThriftReader {
  private pos: number;
  private readonly view: DataView;
  private readonly buf: Uint8Array;

  constructor(buf: Uint8Array, offset = 0) {
    this.buf = buf;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    this.pos = offset;
  }

  /** Current read position. */
  get offset(): number {
    return this.pos;
  }

  /** Read unsigned varint (up to 64 bits returned as bigint). */
  readUVarint(): bigint {
    let result = 0n;
    let shift = 0n;
    for (;;) {
      const byte = this.buf[this.pos++] ?? 0;
      result |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7n;
    }
    return result;
  }

  /** Read signed zigzag-encoded varint as bigint. */
  readZigzag(): bigint {
    const n = this.readUVarint();
    return (n >> 1n) ^ -(n & 1n);
  }

  /** Read a signed i32 (zigzag varint). */
  readI32(): number {
    return Number(BigInt.asIntN(32, this.readZigzag()));
  }

  /** Read a signed i64 (zigzag varint). */
  readI64(): bigint {
    return BigInt.asIntN(64, this.readZigzag());
  }

  /** Read an IEEE 754 double (8 bytes LE). */
  readDouble(): number {
    const v = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }

  /** Read a length-prefixed byte string. */
  readBinary(): Uint8Array {
    const len = Number(this.readUVarint());
    const slice = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return slice;
  }

  /** Read a UTF-8 string (length-prefixed binary). */
  readString(): string {
    return new TextDecoder().decode(this.readBinary());
  }

  /**
   * Decode a struct, calling `handler(fieldId, type)` for each field.
   * Handler returns `true` to skip remaining fields.
   */
  readStruct(handler: (fieldId: number, type: number) => boolean | void): void {
    let prevFieldId = 0;
    for (;;) {
      const header = this.buf[this.pos++] ?? 0;
      if (header === T_STOP) break;
      let type = header & 0x0f;
      let delta = (header >> 4) & 0x0f;
      let fieldId: number;
      if (delta !== 0) {
        fieldId = prevFieldId + delta;
      } else {
        // long-form: next byte is type, then i16 field id (zigzag)
        type = header;
        fieldId = Number(this.readZigzag());
      }
      prevFieldId = fieldId;
      if (handler(fieldId, type) === true) break;
    }
  }

  /** Skip a value of the given type. */
  skipValue(type: number): void {
    switch (type) {
      case T_BOOL_TRUE:
      case T_BOOL_FALSE:
      case T_I8:
        this.pos++;
        break;
      case T_I16:
      case T_I32:
        this.readI32();
        break;
      case T_I64:
        this.readI64();
        break;
      case T_DOUBLE:
        this.pos += 8;
        break;
      case T_BINARY: {
        const len = Number(this.readUVarint());
        this.pos += len;
        break;
      }
      case T_LIST: {
        const header = this.buf[this.pos++] ?? 0;
        let count: number;
        let elemType: number;
        if ((header & 0xf0) === 0xf0) {
          count = this.readI32();
          elemType = header & 0x0f;
        } else {
          count = (header >> 4) & 0x0f;
          elemType = header & 0x0f;
        }
        for (let i = 0; i < count; i++) this.skipValue(elemType);
        break;
      }
      case T_STRUCT:
        this.readStruct(() => {});
        break;
      default:
        break;
    }
  }

  /** Read a list header; returns `{count, elemType}`. */
  readListHeader(): { count: number; elemType: number } {
    const header = this.buf[this.pos++] ?? 0;
    if ((header & 0xf0) === 0xf0) {
      const count = this.readI32();
      const elemType = header & 0x0f;
      return { count, elemType };
    }
    return { count: (header >> 4) & 0x0f, elemType: header & 0x0f };
  }
}

// ─── Thrift compact writer ─────────────────────────────────────────────────────

class ThriftWriter {
  private buf: Uint8Array;
  private pos: number;
  private prevFieldId: number;

  constructor(initialCapacity = 4096) {
    this.buf = new Uint8Array(initialCapacity);
    this.pos = 0;
    this.prevFieldId = 0;
  }

  private ensure(n: number): void {
    if (this.pos + n > this.buf.length) {
      const next = new Uint8Array(Math.max(this.buf.length * 2, this.pos + n + 256));
      next.set(this.buf);
      this.buf = next;
    }
  }

  /** Write unsigned varint. */
  writeUVarint(value: bigint): void {
    let v = value;
    do {
      this.ensure(1);
      const byte = Number(v & 0x7fn);
      v >>= 7n;
      this.buf[this.pos++] = v > 0n ? byte | 0x80 : byte;
    } while (v > 0n);
  }

  /** Write signed zigzag varint (i32). */
  writeI32(n: number): void {
    const v = BigInt(n);
    this.writeUVarint((v << 1n) ^ (v >> 31n));
  }

  /** Write signed zigzag varint (i64 as bigint). */
  writeI64(n: bigint): void {
    this.writeUVarint((n << 1n) ^ (n >> 63n));
  }

  /** Write IEEE 754 double (8 bytes LE). */
  writeDouble(n: number): void {
    this.ensure(8);
    const view = new DataView(this.buf.buffer, this.buf.byteOffset + this.pos, 8);
    view.setFloat64(0, n, true);
    this.pos += 8;
  }

  /** Write length-prefixed binary. */
  writeBinary(data: Uint8Array): void {
    this.writeUVarint(BigInt(data.length));
    this.ensure(data.length);
    this.buf.set(data, this.pos);
    this.pos += data.length;
  }

  /** Write a UTF-8 string (length-prefixed binary). */
  writeString(s: string): void {
    this.writeBinary(new TextEncoder().encode(s));
  }

  /** Write a struct field header. Resets prevFieldId when starting a new struct. */
  writeFieldHeader(fieldId: number, type: number): void {
    const delta = fieldId - this.prevFieldId;
    this.prevFieldId = fieldId;
    this.ensure(2);
    if (delta >= 1 && delta <= 15) {
      this.buf[this.pos++] = ((delta & 0x0f) << 4) | (type & 0x0f);
    } else {
      this.buf[this.pos++] = type & 0x0f;
      this.writeI32(fieldId);
    }
  }

  /** Write STOP byte (end of struct). */
  writeStop(): void {
    this.ensure(1);
    this.buf[this.pos++] = T_STOP;
  }

  /** Reset prevFieldId for a new struct context. */
  beginStruct(): void {
    this.prevFieldId = 0;
  }

  /** Write list header `(count << 4) | elemType`. */
  writeListHeader(count: number, elemType: number): void {
    if (count < 15) {
      this.ensure(1);
      this.buf[this.pos++] = ((count & 0x0f) << 4) | (elemType & 0x0f);
    } else {
      this.ensure(1);
      this.buf[this.pos++] = 0xf0 | (elemType & 0x0f);
      this.writeI32(count);
    }
  }

  /** Return the encoded bytes. */
  finish(): Uint8Array {
    return this.buf.subarray(0, this.pos);
  }
}

// ─── Internal metadata structures ─────────────────────────────────────────────

interface SchemaElement {
  type: number | null; // null for group/root nodes
  typeLength: number;
  repetitionType: number;
  name: string;
  numChildren: number | null;
}

interface PageHeader {
  pageType: number;
  uncompressedSize: number;
  compressedSize: number;
  numValues: number;
  dataEncoding: number;
  defLevelEncoding: number;
}

interface ColMeta {
  physType: number;
  numValues: bigint;
  codec: number;
  dataPageOffset: bigint;
  totalCompressedSize: bigint;
  totalUncompressedSize: bigint;
  pathInSchema: string[];
}

interface ColumnChunk {
  fileOffset: bigint;
  meta: ColMeta;
}

interface RowGroup {
  columns: ColumnChunk[];
  totalByteSize: bigint;
  numRows: bigint;
}

interface FileMetaData {
  version: number;
  schema: SchemaElement[];
  numRows: bigint;
  rowGroups: RowGroup[];
}

// ─── Thrift decoders ─────────────────────────────────────────────────────────

function decodeSchemaElement(r: ThriftReader): SchemaElement {
  let type: number | null = null;
  let typeLength = 0;
  let repetitionType = REP_REQUIRED;
  let name = "";
  let numChildren: number | null = null;

  r.readStruct((fid, ftype) => {
    if (fid === 1 && ftype === T_I32) {
      type = r.readI32();
    } else if (fid === 2 && ftype === T_I32) {
      typeLength = r.readI32();
    } else if (fid === 3 && ftype === T_I32) {
      repetitionType = r.readI32();
    } else if (fid === 4 && ftype === T_BINARY) {
      name = r.readString();
    } else if (fid === 5 && ftype === T_I32) {
      numChildren = r.readI32();
    } else {
      r.skipValue(ftype);
    }
  });

  return { type, typeLength, repetitionType, name, numChildren };
}

function decodeRowGroup(r: ThriftReader): RowGroup {
  const columns: ColumnChunk[] = [];
  let totalByteSize = 0n;
  let numRows = 0n;

  r.readStruct((fid, ftype) => {
    if (fid === 1 && ftype === T_LIST) {
      const { count } = r.readListHeader();
      for (let i = 0; i < count; i++) columns.push(decodeColumnChunk(r));
    } else if (fid === 2 && ftype === T_I64) {
      totalByteSize = r.readI64();
    } else if (fid === 3 && ftype === T_I64) {
      numRows = r.readI64();
    } else {
      r.skipValue(ftype);
    }
  });

  return { columns, totalByteSize, numRows };
}

function decodeColumnChunk(r: ThriftReader): ColumnChunk {
  let fileOffset = 0n;
  let meta: ColMeta = {
    physType: PHYS_BYTE_ARRAY,
    numValues: 0n,
    codec: CODEC_UNCOMPRESSED,
    dataPageOffset: 0n,
    totalCompressedSize: 0n,
    totalUncompressedSize: 0n,
    pathInSchema: [],
  };

  r.readStruct((fid, ftype) => {
    if (fid === 2 && ftype === T_I64) {
      fileOffset = r.readI64();
    } else if (fid === 3 && ftype === T_STRUCT) {
      meta = decodeColMeta(r);
    } else {
      r.skipValue(ftype);
    }
  });

  return { fileOffset, meta };
}

function decodeColMeta(r: ThriftReader): ColMeta {
  let physType = PHYS_BYTE_ARRAY;
  let numValues = 0n;
  let codec = CODEC_UNCOMPRESSED;
  let dataPageOffset = 0n;
  let totalCompressedSize = 0n;
  let totalUncompressedSize = 0n;
  const pathInSchema: string[] = [];

  r.readStruct((fid, ftype) => {
    if (fid === 1 && ftype === T_I32) {
      physType = r.readI32();
    } else if (fid === 2 && ftype === T_LIST) {
      // encodings (list<Encoding>) — skip
      const { count, elemType } = r.readListHeader();
      for (let i = 0; i < count; i++) r.skipValue(elemType);
    } else if (fid === 3 && ftype === T_LIST) {
      // path_in_schema
      const { count } = r.readListHeader();
      for (let i = 0; i < count; i++) pathInSchema.push(r.readString());
    } else if (fid === 4 && ftype === T_I32) {
      codec = r.readI32();
    } else if (fid === 5 && ftype === T_I64) {
      numValues = r.readI64();
    } else if (fid === 6 && ftype === T_I64) {
      totalUncompressedSize = r.readI64();
    } else if (fid === 7 && ftype === T_I64) {
      totalCompressedSize = r.readI64();
    } else if (fid === 9 && ftype === T_I64) {
      dataPageOffset = r.readI64();
    } else {
      r.skipValue(ftype);
    }
  });

  return {
    physType,
    numValues,
    codec,
    dataPageOffset,
    totalCompressedSize,
    totalUncompressedSize,
    pathInSchema,
  };
}

function decodePageHeader(r: ThriftReader): PageHeader {
  let pageType = PAGE_DATA;
  let uncompressedSize = 0;
  let compressedSize = 0;
  let numValues = 0;
  let dataEncoding = ENC_PLAIN;
  let defLevelEncoding = ENC_RLE;
  let repLevelEncoding = ENC_RLE;

  r.readStruct((fid, ftype) => {
    if (fid === 1 && ftype === T_I32) {
      pageType = r.readI32();
    } else if (fid === 2 && ftype === T_I32) {
      uncompressedSize = r.readI32();
    } else if (fid === 3 && ftype === T_I32) {
      compressedSize = r.readI32();
    } else if (fid === 4 && ftype === T_STRUCT) {
      // DataPageHeader
      r.readStruct((fid2, ftype2) => {
        if (fid2 === 1 && ftype2 === T_I32) {
          numValues = r.readI32();
        } else if (fid2 === 2 && ftype2 === T_I32) {
          dataEncoding = r.readI32();
        } else if (fid2 === 3 && ftype2 === T_I32) {
          defLevelEncoding = r.readI32();
        } else if (fid2 === 4 && ftype2 === T_I32) {
          repLevelEncoding = r.readI32();
        } else {
          r.skipValue(ftype2);
        }
      });
    } else if (fid === 5 && ftype === T_STRUCT) {
      // DataPageHeaderV2 - skip
      r.skipValue(ftype);
    } else {
      r.skipValue(ftype);
    }
  });

  return { pageType, uncompressedSize, compressedSize, numValues, dataEncoding, defLevelEncoding };
}

function decodeFileMetaData(buf: Uint8Array, offset: number): FileMetaData {
  const r = new ThriftReader(buf, offset);
  let version = 1;
  let numRows = 0n;
  const schema: SchemaElement[] = [];
  const rowGroups: RowGroup[] = [];

  r.readStruct((fid, ftype) => {
    if (fid === 1 && ftype === T_I32) {
      version = r.readI32();
    } else if (fid === 2 && ftype === T_LIST) {
      const { count } = r.readListHeader();
      for (let i = 0; i < count; i++) schema.push(decodeSchemaElement(r));
    } else if (fid === 3 && ftype === T_I64) {
      numRows = r.readI64();
    } else if (fid === 4 && ftype === T_LIST) {
      const { count } = r.readListHeader();
      for (let i = 0; i < count; i++) rowGroups.push(decodeRowGroup(r));
    } else {
      r.skipValue(ftype);
    }
  });

  return { version, schema, numRows, rowGroups };
}

// ─── RLE definition level decoder ────────────────────────────────────────────

/**
 * Decode RLE-encoded definition levels from a prefix-length byte sequence.
 * Format: 4-byte LE prefix giving byte count, then RLE-encoded stream.
 * RLE runs: `(runLen << 1 | 0)` varint + 1 value byte.
 * Bit-packing runs: `(runLen << 1 | 1)` varint + packed bytes — not used for def levels in PLAIN pages.
 */
function decodeDefLevels(buf: Uint8Array, pos: number, numValues: number): boolean[] {
  const view = new DataView(buf.buffer, buf.byteOffset + pos, 4);
  const byteLen = view.getUint32(0, true);
  pos += 4;

  const defIsPresent: boolean[] = [];
  let i = pos;
  const end = pos + byteLen;

  while (i < end && defIsPresent.length < numValues) {
    // Read varint header
    let header = 0n;
    let shift = 0n;
    while (i < end) {
      const byte = buf[i++] ?? 0;
      header |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7n;
    }
    const isRle = (header & 1n) === 0n;
    const count = Number(header >> 1n);

    if (isRle) {
      // RLE run: one literal value repeated `count` times
      const value = buf[i++] ?? 0;
      for (let k = 0; k < count && defIsPresent.length < numValues; k++) {
        defIsPresent.push(value > 0);
      }
    } else {
      // Bit-packed run: count groups of 8 values, 1 bit each
      const numGroups = count;
      for (let g = 0; g < numGroups; g++) {
        const byte = buf[i++] ?? 0;
        for (let b = 0; b < 8 && defIsPresent.length < numValues; b++) {
          defIsPresent.push(((byte >> b) & 1) === 1);
        }
      }
    }
  }

  return defIsPresent;
}

// ─── Column data decoder ───────────────────────────────────────────────────────

function decodeColumnData(
  buf: Uint8Array,
  meta: ColMeta,
  nRows: number,
  isOptional: boolean,
): Scalar[] {
  const values: Scalar[] = new Array(nRows).fill(null);
  let pos = Number(meta.dataPageOffset);
  let rowsFilled = 0;

  while (rowsFilled < nRows) {
    const r = new ThriftReader(buf, pos);
    const ph = decodePageHeader(r);
    pos = r.offset;

    if (ph.pageType !== PAGE_DATA) {
      pos += ph.compressedSize; // skip data portion (pos is already past the header)
      continue;
    }

    const pageEnd = pos + ph.compressedSize;

    // Decode definition levels if column is optional
    let defLevels: boolean[] | null = null;
    if (isOptional) {
      defLevels = decodeDefLevels(buf, pos, ph.numValues);
      // Advance pos by def level byte size (read 4-byte prefix)
      const view = new DataView(buf.buffer, buf.byteOffset + pos, 4);
      const defByteLen = view.getUint32(0, true);
      pos += 4 + defByteLen;
    }

    // Decode PLAIN data
    const physType = meta.physType;
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    let defIdx = 0;
    for (let i = 0; i < ph.numValues && rowsFilled < nRows; i++) {
      const isPresent = defLevels === null ? true : (defLevels[defIdx++] ?? true);

      if (!isPresent) {
        values[rowsFilled++] = null;
        continue;
      }

      let val: Scalar = null;
      if (physType === PHYS_INT32) {
        val = dv.getInt32(pos, true);
        pos += 4;
      } else if (physType === PHYS_INT64) {
        const bigVal = dv.getBigInt64(pos, true);
        pos += 8;
        // Return as number if within safe integer range, bigint otherwise
        if (bigVal >= BigInt(Number.MIN_SAFE_INTEGER) && bigVal <= BigInt(Number.MAX_SAFE_INTEGER)) {
          val = Number(bigVal);
        } else {
          val = bigVal;
        }
      } else if (physType === PHYS_DOUBLE) {
        val = dv.getFloat64(pos, true);
        pos += 8;
      } else if (physType === PHYS_FLOAT) {
        val = dv.getFloat32(pos, true);
        pos += 4;
      } else if (physType === PHYS_BYTE_ARRAY) {
        const len = dv.getInt32(pos, true);
        pos += 4;
        val = new TextDecoder().decode(buf.subarray(pos, pos + len));
        pos += len;
      }

      values[rowsFilled++] = val;
    }

    // Ensure we advance past the page even if it had different byte alignment
    if (pos < pageEnd) pos = pageEnd;
  }

  return values;
}

// ─── Boolean column decoder (special handling) ────────────────────────────────

function decodeBooleanColumn(
  buf: Uint8Array,
  meta: ColMeta,
  nRows: number,
  isOptional: boolean,
): Scalar[] {
  const values: Scalar[] = new Array(nRows).fill(null);
  let pos = Number(meta.dataPageOffset);
  let rowsFilled = 0;

  while (rowsFilled < nRows) {
    const r = new ThriftReader(buf, pos);
    const ph = decodePageHeader(r);
    pos = r.offset;

    if (ph.pageType !== PAGE_DATA) {
      pos += ph.compressedSize;
      continue;
    }

    const pageEnd = pos + ph.compressedSize;

    let defLevels: boolean[] | null = null;
    if (isOptional) {
      defLevels = decodeDefLevels(buf, pos, ph.numValues);
      const view = new DataView(buf.buffer, buf.byteOffset + pos, 4);
      const defByteLen = view.getUint32(0, true);
      pos += 4 + defByteLen;
    }

    // Count present values for bit-packing
    let presentCount = 0;
    if (defLevels !== null) {
      for (const d of defLevels) if (d) presentCount++;
    } else {
      presentCount = ph.numValues;
    }

    // Read bit-packed booleans
    const boolVals: boolean[] = [];
    let bpos = pos;
    for (let i = 0; i < Math.ceil(presentCount / 8); i++) {
      const byte = buf[bpos++] ?? 0;
      for (let b = 0; b < 8 && boolVals.length < presentCount; b++) {
        boolVals.push(((byte >> b) & 1) === 1);
      }
    }

    let boolIdx = 0;
    for (let i = 0; i < ph.numValues && rowsFilled < nRows; i++) {
      const isPresent = defLevels === null ? true : (defLevels[i] ?? true);
      if (!isPresent) {
        values[rowsFilled++] = null;
      } else {
        values[rowsFilled++] = boolVals[boolIdx++] ?? false;
      }
    }

    pos = pageEnd;
  }

  return values;
}

// ─── Thrift encoder for FileMetaData ─────────────────────────────────────────

function encodeSchemaElement(w: ThriftWriter, el: SchemaElement): void {
  w.beginStruct();
  if (el.type !== null) {
    w.writeFieldHeader(1, T_I32);
    w.writeI32(el.type);
  }
  w.writeFieldHeader(3, T_I32);
  w.writeI32(el.repetitionType);
  w.writeFieldHeader(4, T_BINARY);
  w.writeString(el.name);
  if (el.numChildren !== null) {
    w.writeFieldHeader(5, T_I32);
    w.writeI32(el.numChildren);
  }
  w.writeStop();
}

function encodeColMeta(w: ThriftWriter, m: ColMeta): void {
  w.beginStruct();
  w.writeFieldHeader(1, T_I32);
  w.writeI32(m.physType);
  // encodings list (field 2)
  w.writeFieldHeader(2, T_LIST);
  w.writeListHeader(1, T_I32);
  w.writeI32(ENC_PLAIN);
  // path_in_schema (field 3)
  w.writeFieldHeader(3, T_LIST);
  w.writeListHeader(m.pathInSchema.length, T_BINARY);
  for (const p of m.pathInSchema) w.writeString(p);
  // codec (field 4)
  w.writeFieldHeader(4, T_I32);
  w.writeI32(CODEC_UNCOMPRESSED);
  // num_values (field 5)
  w.writeFieldHeader(5, T_I64);
  w.writeI64(m.numValues);
  // total_uncompressed_size (field 6)
  w.writeFieldHeader(6, T_I64);
  w.writeI64(m.totalUncompressedSize);
  // total_compressed_size (field 7)
  w.writeFieldHeader(7, T_I64);
  w.writeI64(m.totalCompressedSize);
  // data_page_offset (field 9)
  w.writeFieldHeader(9, T_I64);
  w.writeI64(m.dataPageOffset);
  w.writeStop();
}

function encodeColumnChunk(w: ThriftWriter, cc: ColumnChunk): void {
  w.beginStruct();
  w.writeFieldHeader(2, T_I64);
  w.writeI64(cc.fileOffset);
  w.writeFieldHeader(3, T_STRUCT);
  encodeColMeta(w, cc.meta);
  w.writeStop();
}

function encodeRowGroup(w: ThriftWriter, rg: RowGroup): void {
  w.beginStruct();
  w.writeFieldHeader(1, T_LIST);
  w.writeListHeader(rg.columns.length, T_STRUCT);
  for (const cc of rg.columns) encodeColumnChunk(w, cc);
  w.writeFieldHeader(2, T_I64);
  w.writeI64(rg.totalByteSize);
  w.writeFieldHeader(3, T_I64);
  w.writeI64(rg.numRows);
  w.writeStop();
}

function encodePageHeader(w: ThriftWriter, ph: PageHeader): void {
  w.beginStruct();
  w.writeFieldHeader(1, T_I32);
  w.writeI32(ph.pageType);
  w.writeFieldHeader(2, T_I32);
  w.writeI32(ph.uncompressedSize);
  w.writeFieldHeader(3, T_I32);
  w.writeI32(ph.compressedSize);
  // DataPageHeader (field 4)
  w.writeFieldHeader(4, T_STRUCT);
  w.beginStruct();
  w.writeFieldHeader(1, T_I32);
  w.writeI32(ph.numValues);
  w.writeFieldHeader(2, T_I32);
  w.writeI32(ph.dataEncoding);
  w.writeFieldHeader(3, T_I32);
  w.writeI32(ph.defLevelEncoding);
  w.writeFieldHeader(4, T_I32);
  w.writeI32(ENC_RLE);
  w.writeStop();
  w.writeStop();
}

// ─── RLE definition level encoder ────────────────────────────────────────────

/**
 * Encode definition levels as RLE (all-present or all-null runs).
 * Format: 4-byte LE prefix + RLE stream.
 */
function encodeDefLevels(defLevels: readonly boolean[]): Uint8Array {
  // Build RLE stream using runs
  const rleChunks: Uint8Array[] = [];

  let i = 0;
  while (i < defLevels.length) {
    const val = defLevels[i] ?? false;
    let runLen = 1;
    while (i + runLen < defLevels.length && (defLevels[i + runLen] ?? false) === val && runLen < 0x7fffffff) {
      runLen++;
    }
    i += runLen;

    // RLE header: (runLen << 1) | 0, followed by 1 value byte
    const headerBuf = encodeUVarint(BigInt(runLen) << 1n);
    rleChunks.push(headerBuf);
    rleChunks.push(new Uint8Array([val ? 1 : 0]));
  }

  const rleData = concatU8(rleChunks);
  const out = new Uint8Array(4 + rleData.length);
  new DataView(out.buffer).setUint32(0, rleData.length, true);
  out.set(rleData, 4);
  return out;
}

function encodeUVarint(value: bigint): Uint8Array {
  const bytes: number[] = [];
  let v = value;
  do {
    const byte = Number(v & 0x7fn);
    v >>= 7n;
    bytes.push(v > 0n ? byte | 0x80 : byte);
  } while (v > 0n);
  return new Uint8Array(bytes);
}

function concatU8(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const a of arrays) {
    out.set(a, pos);
    pos += a.length;
  }
  return out;
}

// ─── Column data encoder ──────────────────────────────────────────────────────

function determinePhysType(values: readonly Scalar[]): number {
  // Scan non-null values
  let hasBool = false;
  let hasStr = false;
  let hasBigInt = false;
  let hasFloat = false;

  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (typeof v === "boolean") { hasBool = true; continue; }
    if (typeof v === "string") { hasStr = true; continue; }
    if (typeof v === "bigint") { hasBigInt = true; continue; }
    if (typeof v === "number") {
      if (!Number.isInteger(v) || !Number.isFinite(v)) {
        hasFloat = true;
      } else if (Math.abs(v) > 2147483647) {
        hasBigInt = true; // too large for INT32, use INT64
      }
      continue;
    }
    // Date, etc. → store as int64 (ms epoch)
    if (v instanceof Date) { hasBigInt = true; continue; }
  }

  if (hasStr) return PHYS_BYTE_ARRAY;
  if (hasBool && !hasFloat && !hasBigInt) return PHYS_BOOLEAN;
  if (hasBigInt) return PHYS_INT64;
  if (hasFloat) return PHYS_DOUBLE;
  return PHYS_INT32;
}

function encodeColumnPage(
  physType: number,
  values: readonly Scalar[],
  isOptional: boolean,
): Uint8Array {
  const defLevels = values.map((v) => v !== null && v !== undefined);
  const present: Scalar[] = values.filter((v) => v !== null && v !== undefined);

  const parts: Uint8Array[] = [];

  // Write definition levels if optional
  if (isOptional) {
    parts.push(encodeDefLevels(defLevels));
  }

  // Write PLAIN-encoded data
  if (physType === PHYS_BOOLEAN) {
    // Bit-pack booleans: LSB first, 8 values per byte
    const numBytes = Math.ceil(present.length / 8);
    const boolBuf = new Uint8Array(numBytes);
    for (let i = 0; i < present.length; i++) {
      const v = present[i];
      if (v !== null && v !== undefined && v !== false) {
        const byteIndex = Math.floor(i / 8);
        boolBuf[byteIndex] = (boolBuf[byteIndex] ?? 0) | (1 << (i % 8));
      }
    }
    parts.push(boolBuf);
  } else if (physType === PHYS_INT32) {
    const dataBuf = new Uint8Array(present.length * 4);
    const dv = new DataView(dataBuf.buffer);
    for (let i = 0; i < present.length; i++) {
      const v = present[i];
      dv.setInt32(i * 4, typeof v === "number" ? Math.trunc(v) : 0, true);
    }
    parts.push(dataBuf);
  } else if (physType === PHYS_INT64) {
    const dataBuf = new Uint8Array(present.length * 8);
    const dv = new DataView(dataBuf.buffer);
    for (let i = 0; i < present.length; i++) {
      const v = present[i];
      let bigV = 0n;
      if (typeof v === "bigint") bigV = v;
      else if (typeof v === "number") bigV = BigInt(Math.trunc(v));
      else if (v instanceof Date) bigV = BigInt(v.getTime());
      dv.setBigInt64(i * 8, bigV, true);
    }
    parts.push(dataBuf);
  } else if (physType === PHYS_DOUBLE) {
    const dataBuf = new Uint8Array(present.length * 8);
    const dv = new DataView(dataBuf.buffer);
    for (let i = 0; i < present.length; i++) {
      const v = present[i];
      dv.setFloat64(i * 8, typeof v === "number" ? v : 0, true);
    }
    parts.push(dataBuf);
  } else {
    // BYTE_ARRAY
    const chunks: Uint8Array[] = [];
    for (const v of present) {
      const s = v === null || v === undefined ? "" : String(v);
      const encoded = new TextEncoder().encode(s);
      const lenBuf = new Uint8Array(4);
      new DataView(lenBuf.buffer).setInt32(0, encoded.length, true);
      chunks.push(lenBuf, encoded);
    }
    parts.push(concatU8(chunks));
  }

  return concatU8(parts);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a Parquet binary buffer into a {@link DataFrame}.
 *
 * @example
 * ```ts
 * const buf = await Bun.file("data.parquet").bytes();
 * const df = readParquet(buf);
 * ```
 */
export function readParquet(data: Uint8Array, options: ReadParquetOptions = {}): DataFrame {
  // Validate magic bytes
  if (
    data[0] !== 0x50 ||
    data[1] !== 0x41 ||
    data[2] !== 0x52 ||
    data[3] !== 0x31
  ) {
    throw new Error("Not a Parquet file: missing PAR1 magic bytes at start");
  }
  const endMagic = data.subarray(data.length - 4);
  if (
    endMagic[0] !== 0x50 ||
    endMagic[1] !== 0x41 ||
    endMagic[2] !== 0x52 ||
    endMagic[3] !== 0x31
  ) {
    throw new Error("Not a Parquet file: missing PAR1 magic bytes at end");
  }

  // Read footer size (4 bytes LE before end magic)
  const footerSizeView = new DataView(
    data.buffer,
    data.byteOffset + data.length - 8,
    4,
  );
  const footerSize = footerSizeView.getUint32(0, true);
  const footerOffset = data.length - 8 - footerSize;

  const meta = decodeFileMetaData(data, footerOffset);

  // Build leaf schema map: name → repetitionType
  const leafSchema = new Map<string, number>();
  for (const el of meta.schema) {
    if (el.type !== null) {
      leafSchema.set(el.name, el.repetitionType);
    }
  }

  // Collect all column names from first row group
  const allNames: string[] = [];
  if (meta.rowGroups.length > 0) {
    const rg0 = meta.rowGroups[0];
    if (rg0 !== undefined) {
      for (const cc of rg0.columns) {
        const name = cc.meta.pathInSchema[cc.meta.pathInSchema.length - 1] ?? "";
        allNames.push(name);
      }
    }
  } else {
    // No row groups — empty DataFrame
    return DataFrame.fromColumns({});
  }

  // Apply usecols filter
  const { usecols = null, indexCol = null, nRows = null } = options;
  const selectedNames = usecols !== null ? allNames.filter((n) => usecols.includes(n)) : allNames;

  const totalRows = Math.min(Number(meta.numRows), nRows ?? Number(meta.numRows));

  // Collect all data per column across row groups
  const columnData: Map<string, Scalar[]> = new Map();
  for (const name of selectedNames) columnData.set(name, []);

  for (const rg of meta.rowGroups) {
    const rgRows = Number(rg.numRows);

    for (const cc of rg.columns) {
      const colName = cc.meta.pathInSchema[cc.meta.pathInSchema.length - 1] ?? "";
      if (!selectedNames.includes(colName)) continue;

      const repType = leafSchema.get(colName) ?? REP_REQUIRED;
      const isOptional = repType === REP_OPTIONAL;

      let colValues: Scalar[];
      if (cc.meta.physType === PHYS_BOOLEAN) {
        colValues = decodeBooleanColumn(data, cc.meta, rgRows, isOptional);
      } else {
        colValues = decodeColumnData(data, cc.meta, rgRows, isOptional);
      }

      const existing = columnData.get(colName);
      if (existing !== undefined) {
        for (const v of colValues) existing.push(v);
      }
    }
  }

  // Apply nRows limit
  const resultData: Record<string, Scalar[]> = {};
  for (const [name, vals] of columnData) {
    resultData[name] = vals.slice(0, totalRows);
  }

  // Extract index column
  let index: Index<Label> | undefined;
  if (indexCol !== null) {
    const idxName = typeof indexCol === "number" ? (selectedNames[indexCol] ?? "") : indexCol;
    const idxVals = resultData[idxName] ?? [];
    const labels = idxVals.map((v): Label => {
      if (v === null || v === undefined) return null;
      if (typeof v === "number" || typeof v === "string" || typeof v === "boolean" || v instanceof Date) return v;
      if (typeof v === "bigint") return Number(v);
      return null;
    });
    index = new Index(labels);
    delete resultData[idxName];
  }

  const cols: Record<string, readonly Scalar[]> = {};
  for (const [k, v] of Object.entries(resultData)) {
    cols[k] = v;
  }

  return DataFrame.fromColumns(cols, index !== undefined ? { index } : undefined);
}

/**
 * Serialize a {@link DataFrame} to a Parquet binary buffer.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: ["x", "y", "z"] });
 * const buf = toParquet(df);
 * await Bun.write("output.parquet", buf);
 * ```
 */
export function toParquet(df: DataFrame, options: ToParquetOptions = {}): Uint8Array {
  const { writeIndex = false } = options;

  // Collect columns
  const colNames: string[] = [];
  const colArrays: Scalar[][] = [];

  if (writeIndex) {
    colNames.push("__index_level_0__");
    const idxArr: Scalar[] = df.index.toArray();
    colArrays.push(idxArr);
  }
  for (const name of df.columns.toArray()) {
    colNames.push(name);
    colArrays.push(df.col(name).toArray());
  }

  const nRows = df.shape[0];

  // Determine physical types and optionality
  const physTypes = colArrays.map(determinePhysType);
  const isOptionals = colArrays.map((vals) => vals.some((v) => v === null || v === undefined));

  // Build output buffer
  const parts: Uint8Array[] = [MAGIC];
  let filePos = 4; // after magic

  const rowGroupCols: ColumnChunk[] = [];
  let totalByteSize = 0n;

  for (let ci = 0; ci < colNames.length; ci++) {
    const name = colNames[ci] ?? "";
    const vals = colArrays[ci] ?? [];
    const physType = physTypes[ci] ?? PHYS_BYTE_ARRAY;
    const isOptional = isOptionals[ci] ?? false;

    const pageData = encodeColumnPage(physType, vals, isOptional);

    // Encode page header
    const phWriter = new ThriftWriter(64);
    const ph: PageHeader = {
      pageType: PAGE_DATA,
      uncompressedSize: pageData.length,
      compressedSize: pageData.length,
      numValues: nRows,
      dataEncoding: ENC_PLAIN,
      defLevelEncoding: ENC_RLE,
    };
    encodePageHeader(phWriter, ph);
    const pageHeader = phWriter.finish();

    // data_page_offset = absolute file position of the page header start
    const dataPageOffset = BigInt(filePos);
    const pageByteSize = BigInt(pageHeader.length + pageData.length);

    parts.push(pageHeader);
    parts.push(pageData);
    filePos += pageHeader.length + pageData.length;

    rowGroupCols.push({
      fileOffset: dataPageOffset,
      meta: {
        physType,
        numValues: BigInt(nRows),
        codec: CODEC_UNCOMPRESSED,
        dataPageOffset,
        totalCompressedSize: pageByteSize,
        totalUncompressedSize: pageByteSize,
        pathInSchema: [name],
      },
    });
    totalByteSize += pageByteSize;
  }

  // Build schema: root message + leaf columns
  const schema: SchemaElement[] = [
    { type: null, typeLength: 0, repetitionType: REP_REQUIRED, name: "schema", numChildren: colNames.length },
  ];
  for (let ci = 0; ci < colNames.length; ci++) {
    schema.push({
      type: physTypes[ci] ?? PHYS_BYTE_ARRAY,
      typeLength: 0,
      repetitionType: (isOptionals[ci] ?? false) ? REP_OPTIONAL : REP_REQUIRED,
      name: colNames[ci] ?? "",
      numChildren: null,
    });
  }

  const rowGroup: RowGroup = {
    columns: rowGroupCols,
    totalByteSize,
    numRows: BigInt(nRows),
  };

  // Encode FileMetaData
  const fw = new ThriftWriter(4096);
  fw.beginStruct();
  fw.writeFieldHeader(1, T_I32);
  fw.writeI32(2); // version 2
  fw.writeFieldHeader(2, T_LIST);
  fw.writeListHeader(schema.length, T_STRUCT);
  for (const el of schema) encodeSchemaElement(fw, el);
  fw.writeFieldHeader(3, T_I64);
  fw.writeI64(BigInt(nRows));
  fw.writeFieldHeader(4, T_LIST);
  fw.writeListHeader(1, T_STRUCT);
  encodeRowGroup(fw, rowGroup);
  fw.writeFieldHeader(6, T_BINARY);
  fw.writeString("tsb");
  fw.writeStop();
  const footer = fw.finish();

  // Footer size + trailing magic
  const footerSizeBuf = new Uint8Array(4);
  new DataView(footerSizeBuf.buffer).setUint32(0, footer.length, true);

  parts.push(footer);
  parts.push(footerSizeBuf);
  parts.push(MAGIC);

  return concatU8(parts);
}
