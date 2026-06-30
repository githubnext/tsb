/**
 * readOrc / toOrc — Apache ORC (Optimized Row Columnar) file format I/O.
 *
 * Mirrors `pandas.read_orc()` and `DataFrame.to_orc()`.
 *
 * Supported column types (read & write):
 * - BOOLEAN, INT, LONG, FLOAT, DOUBLE, STRING, DATE
 *
 * Compression: NONE (ZLIB/Snappy require an external decompressor).
 * Encoding: DIRECT (integers via RLE v1, strings via raw bytes + lengths,
 *           floats/doubles via raw IEEE 754, booleans via RLE byte v1).
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Options for {@link readOrc}. */
export interface ReadOrcOptions {
  /**
   * Column name to use as the row index.
   * Default: `null` (RangeIndex).
   */
  readonly indexCol?: string | null;
  /**
   * Subset of columns to read. `null` = all columns.
   * Default: `null`.
   */
  readonly columns?: readonly string[] | null;
}

/** Options for {@link toOrc}. */
export interface ToOrcOptions {
  /**
   * Write the DataFrame's row index as an extra column.
   * Default: `false`.
   */
  readonly writeIndex?: boolean;
}

// ─── ORC file constants ───────────────────────────────────────────────────────

// File header magic
const ORC_MAGIC = new Uint8Array([0x4f, 0x52, 0x43]); // "ORC"

// ORC type kinds
const KIND_BOOLEAN = 0;
const KIND_BYTE = 1;
const KIND_SHORT = 2;
const KIND_INT = 3;
const KIND_LONG = 4;
const KIND_FLOAT = 5;
const KIND_DOUBLE = 6;
const KIND_STRING = 7;
const KIND_STRUCT = 12;
const KIND_DATE = 15;

// Compression codecs
const COMP_NONE = 0;
const COMP_ZLIB = 1;

// Stream kinds
const STREAM_PRESENT = 0;
const STREAM_DATA = 1;
const STREAM_LENGTH = 2;
const STREAM_DICTIONARY_DATA = 3;

// Column encoding kinds
const ENC_DIRECT = 0;

// ─── Protobuf utilities ───────────────────────────────────────────────────────

/** A single decoded protobuf field value. */
type PbVal =
  | { readonly wt: 0; readonly v: bigint }
  | { readonly wt: 2; readonly v: Uint8Array }
  | { readonly wt: 1; readonly v: bigint }
  | { readonly wt: 5; readonly v: number };

/** A decoded protobuf message: field number → list of values. */
type PbMsg = Map<number, PbVal[]>;

/** Read a protobuf varint (unsigned, LSB-first). */
function pbReadVarU(buf: Uint8Array, pos: number): [bigint, number] {
  let result = 0n;
  let shift = 0n;
  for (;;) {
    const b = buf[pos];
    if (b === undefined) throw new Error("ORC: truncated varint");
    pos++;
    result |= BigInt(b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7n;
  }
  return [result, pos];
}

/** Decode a protobuf message from a byte slice. */
function pbDecode(buf: Uint8Array): PbMsg {
  const msg: PbMsg = new Map<number, PbVal[]>();
  let pos = 0;
  while (pos < buf.length) {
    let tag: bigint;
    [tag, pos] = pbReadVarU(buf, pos);
    const fieldNum = Number(tag >> 3n);
    const wt = Number(tag & 7n);
    let val: PbVal;
    if (wt === 0) {
      let v: bigint;
      [v, pos] = pbReadVarU(buf, pos);
      val = { wt: 0, v };
    } else if (wt === 2) {
      let len: bigint;
      [len, pos] = pbReadVarU(buf, pos);
      const n = Number(len);
      val = { wt: 2, v: buf.subarray(pos, pos + n) };
      pos += n;
    } else if (wt === 1) {
      const dv = new DataView(buf.buffer, buf.byteOffset + pos, 8);
      const lo = BigInt(dv.getUint32(0, true));
      const hi = BigInt(dv.getUint32(4, true));
      val = { wt: 1, v: (hi << 32n) | lo };
      pos += 8;
    } else if (wt === 5) {
      const dv = new DataView(buf.buffer, buf.byteOffset + pos, 4);
      val = { wt: 5, v: dv.getUint32(0, true) };
      pos += 4;
    } else {
      throw new Error(`ORC: unknown wire type ${wt}`);
    }
    const list = msg.get(fieldNum);
    if (list !== undefined) {
      list.push(val);
    } else {
      msg.set(fieldNum, [val]);
    }
  }
  return msg;
}

/** Get a uint64 field as bigint (default 0). */
function pbU64(msg: PbMsg, field: number): bigint {
  const f = msg.get(field)?.[0];
  return f?.wt === 0 ? f.v : 0n;
}

/** Get a uint32 field as number (default 0). */
function pbU32(msg: PbMsg, field: number): number {
  return Number(pbU64(msg, field));
}

/** Get all uint32 repeated field values. */
function pbU32s(msg: PbMsg, field: number): number[] {
  return (msg.get(field) ?? [])
    .filter((f): f is PbVal & { wt: 0 } => f.wt === 0)
    .map((f) => Number(f.v));
}

/** Get all string repeated field values. */
function pbStrings(msg: PbMsg, field: number): string[] {
  const dec = new TextDecoder();
  return (msg.get(field) ?? [])
    .filter((f): f is PbVal & { wt: 2 } => f.wt === 2)
    .map((f) => dec.decode(f.v));
}

/** Get all embedded message repeated field values. */
function pbMsgs(msg: PbMsg, field: number): PbMsg[] {
  return (msg.get(field) ?? [])
    .filter((f): f is PbVal & { wt: 2 } => f.wt === 2)
    .map((f) => pbDecode(f.v));
}

// ─── Protobuf writer ──────────────────────────────────────────────────────────

function pbWvU(v: bigint, out: number[]): void {
  let val = v;
  while (val >= 128n) {
    out.push(Number(val & 0x7fn) | 0x80);
    val >>= 7n;
  }
  out.push(Number(val));
}

function pbTag(fn: number, wt: 0 | 2, out: number[]): void {
  pbWvU(BigInt((fn << 3) | wt), out);
}

function pbWU64(fn: number, v: bigint, out: number[]): void {
  if (v === 0n) return;
  pbTag(fn, 0, out);
  pbWvU(v, out);
}

function pbWU32(fn: number, v: number, out: number[]): void {
  pbWU64(fn, BigInt(v), out);
}

function pbWBytes(fn: number, v: Uint8Array, out: number[]): void {
  pbTag(fn, 2, out);
  pbWvU(BigInt(v.length), out);
  for (const b of v) out.push(b);
}

function pbWMsg(fn: number, msg: number[], out: number[]): void {
  pbTag(fn, 2, out);
  pbWvU(BigInt(msg.length), out);
  for (const b of msg) out.push(b);
}

// ─── Hadoop VInt ──────────────────────────────────────────────────────────────
// ORC uses big-endian variable-length signed integers for RLE integer streams.

/**
 * Read a Hadoop-style variable-length signed integer.
 *
 * Byte ranges:
 * - 0x00–0x7F: single-byte positive (0–127)
 * - 0x88–0x8F: positive multi-byte (1–8 data bytes follow)
 * - 0x80–0x87: negative multi-byte (1–8 data bytes follow, XOR with -1)
 * - 0x90–0xFF: single-byte negative (-112 to -1)
 */
function hvReadVInt(buf: Uint8Array, pos: number): [bigint, number] {
  const fb = buf[pos];
  if (fb === undefined) throw new Error("ORC: truncated Hadoop VInt");
  pos++;
  // Interpret as signed byte
  const sfb = fb >= 0x80 ? fb - 0x100 : fb;
  // Single-byte range: -112 to 127
  if (sfb >= -112) return [BigInt(sfb), pos];
  // Multi-byte
  const isNeg = sfb < -120; // unsigned 128–135 = negative; 136–143 = positive
  const len = isNeg ? -119 - sfb : -111 - sfb; // total bytes incl. header
  let value = 0n;
  for (let i = 1; i < len; i++) {
    const b = buf[pos];
    if (b === undefined) throw new Error("ORC: truncated Hadoop VInt data");
    pos++;
    value = (value << 8n) | BigInt(b);
  }
  if (isNeg) value ^= -1n;
  return [value, pos];
}

/** Write a Hadoop-style variable-length signed integer. */
function hvWriteVInt(value: bigint, out: number[]): void {
  if (value >= -112n && value <= 127n) {
    out.push(Number(value < 0n ? value + 256n : value));
    return;
  }
  let uval = value;
  const isNeg = value < 0n;
  if (isNeg) uval = value ^ -1n;
  let nbytes = 0;
  let tmp = uval;
  while (tmp > 0n) {
    tmp >>= 8n;
    nbytes++;
  }
  const header = isNeg ? -120 - nbytes : -112 - nbytes;
  out.push(header < 0 ? header + 0x100 : header);
  for (let i = nbytes - 1; i >= 0; i--) {
    out.push(Number((uval >> BigInt(i * 8)) & 0xffn));
  }
}

// ─── RLE byte v1 ─────────────────────────────────────────────────────────────

/**
 * Decode an ORC RLE byte v1 stream to a flat byte array.
 * Control byte < 128: run of (ctrl + 3) copies of the next byte.
 * Control byte >= 128: (256 - ctrl) literal bytes follow.
 */
function rleByteDecodeV1(buf: Uint8Array, off: number, len: number): Uint8Array {
  const end = off + len;
  const out: number[] = [];
  let pos = off;
  while (pos < end) {
    const ctrl = buf[pos];
    if (ctrl === undefined) break;
    pos++;
    if (ctrl < 128) {
      const count = ctrl + 3;
      const val = buf[pos];
      if (val === undefined) break;
      pos++;
      for (let i = 0; i < count; i++) out.push(val);
    } else {
      const count = 256 - ctrl;
      for (let i = 0; i < count; i++) {
        const b = buf[pos];
        if (b === undefined) break;
        pos++;
        out.push(b);
      }
    }
  }
  return new Uint8Array(out);
}

/** Encode bytes using RLE byte v1. */
function rleByteEncodeV1(data: readonly number[]): Uint8Array {
  if (data.length === 0) return new Uint8Array(0);
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    // Look for a run (same value repeated)
    let runLen = 1;
    while (runLen < 130 && i + runLen < data.length && data[i + runLen] === data[i]) {
      runLen++;
    }
    if (runLen >= 3) {
      out.push(runLen - 3);
      const d = data[i];
      if (d === undefined) throw new Error("ORC: undefined byte in run");
      out.push(d);
      i += runLen;
    } else {
      // Literal group
      let litLen = 1;
      while (litLen < 128 && i + litLen < data.length) {
        // Stop if next 3 values are identical (start a new run)
        const base = data[i + litLen];
        let rcheck = 1;
        while (rcheck < 3 && i + litLen + rcheck < data.length && data[i + litLen + rcheck] === base) {
          rcheck++;
        }
        if (rcheck >= 3) break;
        litLen++;
      }
      out.push(256 - litLen);
      for (let j = 0; j < litLen; j++) {
        const d = data[i + j];
        if (d === undefined) throw new Error("ORC: undefined byte in literal");
        out.push(d);
      }
      i += litLen;
    }
  }
  return new Uint8Array(out);
}

// ─── RLE integer v1 ──────────────────────────────────────────────────────────

/**
 * Decode an ORC RLE integer v1 stream (Hadoop VInts, big-endian).
 * Control byte >= 0: run of (ctrl + 3) values, next byte is signed delta, then base VInt.
 * Control byte < 0: (-ctrl) literal VInts.
 */
function rleIntDecodeV1(buf: Uint8Array, off: number, len: number): bigint[] {
  const end = off + len;
  const result: bigint[] = [];
  let pos = off;
  while (pos < end) {
    const ctrl = buf[pos];
    if (ctrl === undefined) break;
    pos++;
    const sctrl = ctrl >= 0x80 ? ctrl - 0x100 : ctrl; // signed
    if (sctrl >= 0) {
      const count = sctrl + 3;
      const deltaByte = buf[pos];
      if (deltaByte === undefined) break;
      pos++;
      const delta = BigInt(deltaByte >= 0x80 ? deltaByte - 0x100 : deltaByte);
      let base: bigint;
      [base, pos] = hvReadVInt(buf, pos);
      for (let i = 0; i < count; i++) {
        result.push(base + delta * BigInt(i));
      }
    } else {
      const count = -sctrl;
      for (let i = 0; i < count; i++) {
        let v: bigint;
        [v, pos] = hvReadVInt(buf, pos);
        result.push(v);
      }
    }
  }
  return result;
}

/** Encode bigint values using RLE integer v1. */
function rleIntEncodeV1(values: readonly bigint[]): Uint8Array {
  if (values.length === 0) return new Uint8Array(0);
  const out: number[] = [];
  let i = 0;
  while (i < values.length) {
    const v0 = values[i];
    if (v0 === undefined) break;
    // Attempt to find a run with a constant delta
    if (i + 2 < values.length) {
      const v1 = values[i + 1];
      const v2 = values[i + 2];
      if (v1 !== undefined && v2 !== undefined) {
        const delta = v1 - v0;
        if (v2 - v1 === delta && delta >= -128n && delta <= 127n) {
          let runLen = 3;
          while (runLen < 130 && i + runLen < values.length) {
            const vn = values[i + runLen];
            const vprev = values[i + runLen - 1];
            if (vn === undefined || vprev === undefined || vn - vprev !== delta) break;
            runLen++;
          }
          out.push(runLen - 3);
          out.push(Number(delta < 0n ? delta + 256n : delta));
          hvWriteVInt(v0, out);
          i += runLen;
          continue;
        }
      }
    }
    // Literal group
    let litLen = 1;
    while (litLen < 128 && i + litLen < values.length) {
      const va = values[i + litLen];
      const vb = values[i + litLen + 1];
      const vc = values[i + litLen + 2];
      if (va !== undefined && vb !== undefined && vc !== undefined) {
        const d1 = vb - va;
        const d2 = vc - vb;
        if (d1 === d2 && d1 >= -128n && d1 <= 127n) break;
      }
      litLen++;
    }
    out.push(256 - litLen);
    for (let j = 0; j < litLen; j++) {
      const v = values[i + j];
      if (v === undefined) break;
      hvWriteVInt(v, out);
    }
    i += litLen;
  }
  return new Uint8Array(out);
}

// ─── PRESENT stream helpers ───────────────────────────────────────────────────

/**
 * Expand a PRESENT-stream byte array into per-row boolean flags.
 * Each byte = 8 rows, MSB first. 1 = non-null, 0 = null.
 */
function expandPresent(raw: Uint8Array, nRows: number): boolean[] {
  const flags: boolean[] = [];
  for (let i = 0; i < nRows; i++) flags.push(false);
  let row = 0;
  for (const byte of raw) {
    for (let bit = 7; bit >= 0 && row < nRows; bit--, row++) {
      flags[row] = ((byte >> bit) & 1) === 1;
    }
  }
  return flags;
}

/**
 * Pack per-row null flags into PRESENT-stream bytes.
 * 1 = non-null, 0 = null. Returns null if all rows are non-null.
 */
function packPresent(nonNull: boolean[]): Uint8Array | null {
  if (nonNull.every((v) => v)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < nonNull.length; i += 8) {
    let byte = 0;
    for (let bit = 0; bit < 8 && i + bit < nonNull.length; bit++) {
      if (nonNull[i + bit]) byte |= 1 << (7 - bit);
    }
    bytes.push(byte);
  }
  return new Uint8Array(bytes);
}

// ─── ORC metadata structures (decoded) ────────────────────────────────────────

interface OrcPostscript {
  footerLength: number;
  compression: number;
  compressionBlockSize: number;
  metadataLength: number;
  writerVersion: number;
}

interface OrcStripeInfo {
  offset: number;
  indexLength: number;
  dataLength: number;
  footerLength: number;
  numberOfRows: number;
}

interface OrcType {
  kind: number;
  subtypes: number[];
  fieldNames: string[];
}

interface OrcFooter {
  stripes: OrcStripeInfo[];
  types: OrcType[];
  numberOfRows: number;
}

interface OrcStream {
  kind: number;
  column: number;
  length: number;
}

interface OrcColumnEncoding {
  kind: number;
  dictionarySize: number;
}

interface OrcStripeFooter {
  streams: OrcStream[];
  columns: OrcColumnEncoding[];
}

// ─── ORC decoding helpers ─────────────────────────────────────────────────────

function decodePostscript(buf: Uint8Array): OrcPostscript {
  const msg = pbDecode(buf);
  return {
    footerLength: Number(pbU64(msg, 1)),
    compression: pbU32(msg, 2),
    compressionBlockSize: Number(pbU64(msg, 3)) || 262144,
    metadataLength: Number(pbU64(msg, 5)),
    writerVersion: pbU32(msg, 6),
  };
}

function decodeFooter(buf: Uint8Array): OrcFooter {
  const msg = pbDecode(buf);
  const stripesMsgs = pbMsgs(msg, 3);
  const stripes: OrcStripeInfo[] = stripesMsgs.map((sm) => ({
    offset: Number(pbU64(sm, 1)),
    indexLength: Number(pbU64(sm, 2)),
    dataLength: Number(pbU64(sm, 3)),
    footerLength: Number(pbU64(sm, 4)),
    numberOfRows: Number(pbU64(sm, 5)),
  }));
  const typesMsgs = pbMsgs(msg, 4);
  const types: OrcType[] = typesMsgs.map((tm) => ({
    kind: pbU32(tm, 1),
    subtypes: pbU32s(tm, 2),
    fieldNames: pbStrings(tm, 3),
  }));
  return {
    stripes,
    types,
    numberOfRows: Number(pbU64(msg, 6)),
  };
}

function decodeStripeFooter(buf: Uint8Array): OrcStripeFooter {
  const msg = pbDecode(buf);
  const streamMsgs = pbMsgs(msg, 1);
  const streams: OrcStream[] = streamMsgs.map((sm) => ({
    kind: pbU32(sm, 1),
    column: pbU32(sm, 2),
    length: Number(pbU64(sm, 3)),
  }));
  const colMsgs = pbMsgs(msg, 2);
  const columns: OrcColumnEncoding[] = colMsgs.map((cm) => ({
    kind: pbU32(cm, 1),
    dictionarySize: pbU32(cm, 2),
  }));
  return { streams, columns };
}

// ─── Column data decoders ─────────────────────────────────────────────────────

function decodeIntCol(
  dataBuf: Uint8Array,
  off: number,
  len: number,
  presentFlags: boolean[] | null,
  nRows: number,
): (bigint | null)[] {
  const ints = rleIntDecodeV1(dataBuf, off, len);
  const result: (bigint | null)[] = [];
  let dataIdx = 0;
  for (let i = 0; i < nRows; i++) {
    if (presentFlags !== null && presentFlags[i] === false) {
      result.push(null);
    } else {
      result.push(ints[dataIdx] ?? null);
      dataIdx++;
    }
  }
  return result;
}

function decodeF32Col(
  dataBuf: Uint8Array,
  off: number,
  presentFlags: boolean[] | null,
  nRows: number,
): (number | null)[] {
  const dv = new DataView(dataBuf.buffer, dataBuf.byteOffset);
  const result: (number | null)[] = [];
  let pos = off;
  for (let i = 0; i < nRows; i++) {
    if (presentFlags !== null && presentFlags[i] === false) {
      result.push(null);
    } else {
      result.push(dv.getFloat32(pos, true));
      pos += 4;
    }
  }
  return result;
}

function decodeF64Col(
  dataBuf: Uint8Array,
  off: number,
  presentFlags: boolean[] | null,
  nRows: number,
): (number | null)[] {
  const dv = new DataView(dataBuf.buffer, dataBuf.byteOffset);
  const result: (number | null)[] = [];
  let pos = off;
  for (let i = 0; i < nRows; i++) {
    if (presentFlags !== null && presentFlags[i] === false) {
      result.push(null);
    } else {
      result.push(dv.getFloat64(pos, true));
      pos += 8;
    }
  }
  return result;
}

function decodeStringCol(
  dataBuf: Uint8Array,
  dataOff: number,
  lenBuf: Uint8Array,
  lenOff: number,
  lenLen: number,
  presentFlags: boolean[] | null,
  nRows: number,
): (string | null)[] {
  const lengths = rleIntDecodeV1(lenBuf, lenOff, lenLen);
  const dec = new TextDecoder();
  const result: (string | null)[] = [];
  let dataPos = dataOff;
  let strIdx = 0;
  for (let i = 0; i < nRows; i++) {
    if (presentFlags !== null && presentFlags[i] === false) {
      result.push(null);
    } else {
      const slen = Number(lengths[strIdx] ?? 0n);
      result.push(dec.decode(dataBuf.subarray(dataPos, dataPos + slen)));
      dataPos += slen;
      strIdx++;
    }
  }
  return result;
}

function decodeBoolCol(
  dataBuf: Uint8Array,
  off: number,
  len: number,
  presentFlags: boolean[] | null,
  nRows: number,
): (boolean | null)[] {
  const raw = rleByteDecodeV1(dataBuf, off, len);
  const result: (boolean | null)[] = [];
  let bitIdx = 0;
  for (let i = 0; i < nRows; i++) {
    if (presentFlags !== null && presentFlags[i] === false) {
      result.push(null);
    } else {
      const bytePos = Math.floor(bitIdx / 8);
      const bitPos = 7 - (bitIdx % 8);
      const byte = raw[bytePos] ?? 0;
      result.push(((byte >> bitPos) & 1) === 1);
      bitIdx++;
    }
  }
  return result;
}

// ─── Column data encoders ─────────────────────────────────────────────────────

interface EncodedCol {
  presentStream: Uint8Array | null;
  dataStream: Uint8Array;
  lengthStream: Uint8Array | null;
  typeKind: number;
}

function encodeIntCol(values: readonly Scalar[], typeKind: number): EncodedCol {
  const nonNull: boolean[] = [];
  const ints: bigint[] = [];
  for (const v of values) {
    const isPresent = v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v));
    nonNull.push(isPresent);
    if (isPresent) {
      ints.push(typeof v === "number" ? BigInt(Math.trunc(v)) : BigInt(String(v)));
    }
  }
  const presentBits = packPresent(nonNull);
  const presentStream = presentBits !== null ? rleByteEncodeV1(Array.from(presentBits)) : null;
  return {
    presentStream,
    dataStream: rleIntEncodeV1(ints),
    lengthStream: null,
    typeKind,
  };
}

function encodeF32Col(values: readonly Scalar[]): EncodedCol {
  const nonNull: boolean[] = [];
  const bytes: number[] = [];
  const tmp = new ArrayBuffer(4);
  const dv = new DataView(tmp);
  for (const v of values) {
    const isPresent = v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v));
    nonNull.push(isPresent);
    if (isPresent) {
      dv.setFloat32(0, typeof v === "number" ? v : Number(v), true);
      bytes.push(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
    }
  }
  const presentBits = packPresent(nonNull);
  return {
    presentStream: presentBits !== null ? rleByteEncodeV1(Array.from(presentBits)) : null,
    dataStream: new Uint8Array(bytes),
    lengthStream: null,
    typeKind: KIND_FLOAT,
  };
}

function encodeF64Col(values: readonly Scalar[]): EncodedCol {
  const nonNull: boolean[] = [];
  const bytes: number[] = [];
  const tmp = new ArrayBuffer(8);
  const dv = new DataView(tmp);
  for (const v of values) {
    const isPresent = v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v));
    nonNull.push(isPresent);
    if (isPresent) {
      dv.setFloat64(0, typeof v === "number" ? v : Number(v), true);
      for (let k = 0; k < 8; k++) bytes.push(dv.getUint8(k));
    }
  }
  const presentBits = packPresent(nonNull);
  return {
    presentStream: presentBits !== null ? rleByteEncodeV1(Array.from(presentBits)) : null,
    dataStream: new Uint8Array(bytes),
    lengthStream: null,
    typeKind: KIND_DOUBLE,
  };
}

function encodeStringCol(values: readonly Scalar[]): EncodedCol {
  const nonNull: boolean[] = [];
  const dataBytes: number[] = [];
  const lengths: bigint[] = [];
  const enc = new TextEncoder();
  for (const v of values) {
    const isPresent = v !== null && v !== undefined;
    nonNull.push(isPresent);
    if (isPresent) {
      const bytes = enc.encode(String(v));
      for (const b of bytes) dataBytes.push(b);
      lengths.push(BigInt(bytes.length));
    }
  }
  const presentBits = packPresent(nonNull);
  return {
    presentStream: presentBits !== null ? rleByteEncodeV1(Array.from(presentBits)) : null,
    dataStream: new Uint8Array(dataBytes),
    lengthStream: rleIntEncodeV1(lengths),
    typeKind: KIND_STRING,
  };
}

function encodeBoolCol(values: readonly Scalar[]): EncodedCol {
  const nonNull: boolean[] = [];
  const bits: boolean[] = [];
  for (const v of values) {
    const isPresent = v !== null && v !== undefined;
    nonNull.push(isPresent);
    if (isPresent) bits.push(Boolean(v));
  }
  // Pack booleans into bytes, MSB first
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8 && i + b < bits.length; b++) {
      if (bits[i + b]) byte |= 1 << (7 - b);
    }
    bytes.push(byte);
  }
  const presentBits = packPresent(nonNull);
  return {
    presentStream: presentBits !== null ? rleByteEncodeV1(Array.from(presentBits)) : null,
    dataStream: rleByteEncodeV1(bytes),
    lengthStream: null,
    typeKind: KIND_BOOLEAN,
  };
}

// ─── ORC type inference ───────────────────────────────────────────────────────

/** Map a DataFrame column's values to an ORC type kind. */
function inferOrcKind(values: readonly Scalar[]): number {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (typeof v === "boolean") return KIND_BOOLEAN;
    if (typeof v === "bigint") return KIND_LONG;
    if (typeof v === "number") return Number.isInteger(v) ? KIND_LONG : KIND_DOUBLE;
    if (typeof v === "string") return KIND_STRING;
  }
  return KIND_STRING; // default for all-null columns
}

/** Encode a column based on its inferred or given type. */
function encodeColumn(values: readonly Scalar[], kind: number): EncodedCol {
  switch (kind) {
    case KIND_BOOLEAN:
      return encodeBoolCol(values);
    case KIND_FLOAT:
      return encodeF32Col(values);
    case KIND_DOUBLE:
      return encodeF64Col(values);
    case KIND_STRING:
      return encodeStringCol(values);
    default:
      // All integer types → LONG
      return encodeIntCol(values, KIND_LONG);
  }
}

// ─── Postscript / Footer encoding ────────────────────────────────────────────

function encodePostscript(footerLen: number, metaLen: number): Uint8Array {
  const out: number[] = [];
  pbWU64(1, BigInt(footerLen), out); // footerLength
  pbWU32(2, COMP_NONE, out); // compression = NONE
  // compressionBlockSize: omit (default)
  // version: [0, 12] = ORC v0.12
  pbWU32(4, 0, out);
  pbWU32(4, 12, out);
  pbWU64(5, BigInt(metaLen), out); // metadataLength
  pbWU32(6, 1, out); // writerVersion
  // magic: "ORC" (field 8000)
  const magic = new TextEncoder().encode("ORC");
  pbWBytes(8000, magic, out);
  return new Uint8Array(out);
}

function encodeFooter(
  stripes: OrcStripeInfo[],
  types: OrcType[],
  nRows: number,
): Uint8Array {
  const out: number[] = [];
  pbWU64(1, BigInt(ORC_MAGIC.length), out); // headerLength = 3
  // contentLength: sum of stripe sizes
  const content = stripes.reduce((s, st) => s + st.indexLength + st.dataLength + st.footerLength, 0);
  pbWU64(2, BigInt(content), out);

  for (const stripe of stripes) {
    const sm: number[] = [];
    pbWU64(1, BigInt(stripe.offset), sm);
    pbWU64(2, BigInt(stripe.indexLength), sm);
    pbWU64(3, BigInt(stripe.dataLength), sm);
    pbWU64(4, BigInt(stripe.footerLength), sm);
    pbWU64(5, BigInt(stripe.numberOfRows), sm);
    pbWMsg(3, sm, out);
  }

  for (const type of types) {
    const tm: number[] = [];
    pbWU32(1, type.kind, tm);
    for (const st of type.subtypes) pbWU32(2, st, tm);
    for (const fn of type.fieldNames) {
      const fnBytes = new TextEncoder().encode(fn);
      pbWBytes(3, fnBytes, tm);
    }
    pbWMsg(4, tm, out);
  }

  pbWU64(6, BigInt(nRows), out);
  pbWU32(8, 10000, out); // rowIndexStride
  return new Uint8Array(out);
}

function encodeStripeFooter(streams: OrcStream[], columns: OrcColumnEncoding[]): Uint8Array {
  const out: number[] = [];
  for (const s of streams) {
    const sm: number[] = [];
    pbWU32(1, s.kind, sm);
    pbWU32(2, s.column, sm);
    pbWU64(3, BigInt(s.length), sm);
    pbWMsg(1, sm, out);
  }
  for (const c of columns) {
    const cm: number[] = [];
    pbWU32(1, c.kind, cm);
    if (c.dictionarySize > 0) pbWU32(2, c.dictionarySize, cm);
    pbWMsg(2, cm, out);
  }
  return new Uint8Array(out);
}

// ─── Main: readOrc ────────────────────────────────────────────────────────────

/** Convert a Scalar value to a Label (non-Label Scalars become null). */
function scalarToLabel(v: Scalar): Label {
  if (v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  if (v === null) return null;
  if (v instanceof Date) return v;
  return null; // TimedeltaLike
}

/**
 * Parse an ORC binary buffer into a DataFrame.
 *
 * @param data - Raw ORC file bytes (Uint8Array or ArrayBuffer).
 * @param options - Optional settings.
 * @returns Parsed DataFrame.
 *
 * @example
 * ```ts
 * import { readOrc, toOrc, DataFrame } from "tsb";
 * const buf = toOrc(DataFrame.fromColumns({ x: [1, 2, 3], y: ["a", "b", "c"] }));
 * const df = readOrc(buf);
 * ```
 */
export function readOrc(data: Uint8Array | ArrayBuffer, options: ReadOrcOptions = {}): DataFrame {
  const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  if (buf.length < 4) throw new Error("ORC: file too small");
  // Validate magic
  if (buf[0] !== 0x4f || buf[1] !== 0x52 || buf[2] !== 0x43) {
    throw new Error("ORC: invalid magic bytes (expected 'ORC')");
  }
  // Read postscript
  const psLen = buf[buf.length - 1];
  if (psLen === undefined || psLen === 0) throw new Error("ORC: invalid postscript length");
  const psStart = buf.length - 1 - psLen;
  if (psStart < 3) throw new Error("ORC: file too small for postscript");
  const ps = decodePostscript(buf.subarray(psStart, psStart + psLen));
  if (ps.compression !== COMP_NONE) {
    throw new Error(
      `ORC: compression codec ${ps.compression} (${ps.compression === COMP_ZLIB ? "ZLIB" : "unsupported"}) is not supported; only NONE is currently implemented`,
    );
  }
  // Read footer
  const metaEnd = psStart;
  const footerEnd = metaEnd - ps.metadataLength;
  const footerStart = footerEnd - ps.footerLength;
  if (footerStart < 3) throw new Error("ORC: invalid footer position");
  const footer = decodeFooter(buf.subarray(footerStart, footerEnd));
  if (footer.types.length === 0) throw new Error("ORC: no type schema in footer");

  // Root type must be STRUCT
  const rootType = footer.types[0];
  if (rootType === undefined || rootType.kind !== KIND_STRUCT) {
    throw new Error("ORC: root type is not STRUCT");
  }

  // Column selection
  const allCols = rootType.fieldNames;
  const wantSet =
    options.columns != null ? new Set<string>([...options.columns]) : null;
  const colIndices: number[] = rootType.subtypes.filter((_, i) => {
    const name = allCols[i];
    return name !== undefined && (wantSet === null || wantSet.has(name));
  });
  const colNames: string[] = colIndices.map((ci) => {
    const fi = rootType.subtypes.indexOf(ci);
    return allCols[fi] ?? String(ci);
  });

  const allValues: Map<string, Scalar[]> = new Map();
  for (const name of colNames) allValues.set(name, []);

  // Process each stripe
  for (const stripeInfo of footer.stripes) {
    const stripeDataStart = stripeInfo.offset + stripeInfo.indexLength;
    const stripeFStart = stripeInfo.offset + stripeInfo.indexLength + stripeInfo.dataLength;
    const stripeFBuf = buf.subarray(stripeFStart, stripeFStart + stripeInfo.footerLength);
    const sf = decodeStripeFooter(stripeFBuf);

    // Build a stream-offset map: column → streamKind → {offset, length}
    type StreamLoc = { offset: number; length: number };
    const streamMap = new Map<number, Map<number, StreamLoc>>();
    let streamPos = stripeDataStart;
    for (const stream of sf.streams) {
      let colMap = streamMap.get(stream.column);
      if (colMap === undefined) {
        colMap = new Map<number, StreamLoc>();
        streamMap.set(stream.column, colMap);
      }
      colMap.set(stream.kind, { offset: streamPos, length: stream.length });
      streamPos += stream.length;
    }

    const nRows = stripeInfo.numberOfRows;

    for (let ci = 0; ci < colIndices.length; ci++) {
      const colIdx = colIndices[ci];
      if (colIdx === undefined) continue;
      const name = colNames[ci];
      if (name === undefined) continue;
      const typeKind = footer.types[colIdx]?.kind ?? KIND_STRING;
      const colStreams = streamMap.get(colIdx);
      const vals = allValues.get(name);
      if (vals === undefined) continue;

      // PRESENT stream (null flags)
      const presentLoc = colStreams?.get(STREAM_PRESENT);
      let presentFlags: boolean[] | null = null;
      if (presentLoc !== undefined && presentLoc.length > 0) {
        const rawPresent = rleByteDecodeV1(buf, presentLoc.offset, presentLoc.length);
        presentFlags = expandPresent(rawPresent, nRows);
      }

      const dataLoc = colStreams?.get(STREAM_DATA);
      const dataOff = dataLoc?.offset ?? 0;
      const dataLen = dataLoc?.length ?? 0;

      switch (typeKind) {
        case KIND_BOOLEAN: {
          const decoded = decodeBoolCol(buf, dataOff, dataLen, presentFlags, nRows);
          for (const v of decoded) vals.push(v);
          break;
        }
        case KIND_FLOAT: {
          const decoded = decodeF32Col(buf, dataOff, presentFlags, nRows);
          for (const v of decoded) vals.push(v);
          break;
        }
        case KIND_DOUBLE: {
          const decoded = decodeF64Col(buf, dataOff, presentFlags, nRows);
          for (const v of decoded) vals.push(v);
          break;
        }
        case KIND_STRING: {
          const lenLoc = colStreams?.get(STREAM_LENGTH);
          const decoded = decodeStringCol(
            buf,
            dataOff,
            buf,
            lenLoc?.offset ?? 0,
            lenLoc?.length ?? 0,
            presentFlags,
            nRows,
          );
          for (const v of decoded) vals.push(v);
          break;
        }
        default: {
          // Integer types: BOOLEAN, BYTE, SHORT, INT, LONG, DATE
          const decoded = decodeIntCol(buf, dataOff, dataLen, presentFlags, nRows);
          for (const v of decoded) vals.push(typeKind === KIND_DATE ? Number(v ?? 0) : Number(v ?? 0));
          break;
        }
      }
    }
  }

  // Build DataFrame
  const cols: Record<string, Scalar[]> = {};
  const indexColName = options.indexCol ?? null;
  let indexArr: Label[] | null = null;

  for (const name of colNames) {
    const data2 = allValues.get(name) ?? [];
    if (name === indexColName) {
      indexArr = data2.map(scalarToLabel);
    } else {
      cols[name] = data2;
    }
  }

  const df = DataFrame.fromColumns(cols);
  if (indexArr !== null) {
    return df.setIndex(new Index(indexArr));
  }
  return df;
}

// ─── Main: toOrc ─────────────────────────────────────────────────────────────

/**
 * Serialize a DataFrame to an ORC binary buffer.
 *
 * @param df - DataFrame to serialize.
 * @param options - Optional settings.
 * @returns Raw ORC file bytes.
 *
 * @example
 * ```ts
 * import { toOrc, DataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ x: [1, 2, 3], y: ["a", "b", "c"] });
 * const buf = toOrc(df);
 * ```
 */
export function toOrc(df: DataFrame, options: ToOrcOptions = {}): Uint8Array {
  const colNames = df.columns.toArray().map(String);
  const extraCols: string[] = options.writeIndex === true ? ["__index__", ...colNames] : colNames;
  const indexVals: Scalar[] | null =
    options.writeIndex === true ? df.index.toArray() : null;

  // Collect column data
  const colData: Scalar[][] = extraCols.map((name) =>
    name === "__index__" && indexVals !== null ? indexVals : df.col(name).values.slice(),
  );

  // Infer ORC type kinds
  const colKinds: number[] = colData.map((vals) => inferOrcKind(vals));

  // Encode columns
  const encoded: EncodedCol[] = colData.map((vals, i) => {
    const k = colKinds[i] ?? KIND_STRING;
    return encodeColumn(vals, k);
  });

  // Build file byte array
  const out: number[] = [];

  // Header "ORC"
  for (const b of ORC_MAGIC) out.push(b);

  // Build one stripe
  const nRows = df.height;
  const stripeOffset = 3; // after header

  // Write all streams
  const streams: OrcStream[] = [];
  const colEncodings: OrcColumnEncoding[] = [{ kind: ENC_DIRECT, dictionarySize: 0 }]; // root STRUCT
  let streamPos = stripeOffset;

  for (let ci = 0; ci < encoded.length; ci++) {
    const enc = encoded[ci];
    if (enc === undefined) continue;
    const colIdx = ci + 1; // 1-based (0 = root STRUCT)

    if (enc.presentStream !== null) {
      streams.push({ kind: STREAM_PRESENT, column: colIdx, length: enc.presentStream.length });
    }
    streams.push({ kind: STREAM_DATA, column: colIdx, length: enc.dataStream.length });
    if (enc.lengthStream !== null) {
      streams.push({ kind: STREAM_LENGTH, column: colIdx, length: enc.lengthStream.length });
    }
    colEncodings.push({ kind: ENC_DIRECT, dictionarySize: 0 });
  }

  // Write stream data
  const stripeIndexLen = 0; // no row indexes
  for (let ci = 0; ci < encoded.length; ci++) {
    const enc = encoded[ci];
    if (enc === undefined) continue;
    if (enc.presentStream !== null) {
      for (const b of enc.presentStream) out.push(b);
    }
    for (const b of enc.dataStream) out.push(b);
    if (enc.lengthStream !== null) {
      for (const b of enc.lengthStream) out.push(b);
    }
  }

  // Compute data length (written bytes minus header)
  const stripeDataLen = out.length - stripeOffset;

  // Stripe footer
  const sf = encodeStripeFooter(streams, colEncodings);
  for (const b of sf) out.push(b);

  // Build ORC type schema
  // Column 0: STRUCT with all column fields
  const types: OrcType[] = [
    {
      kind: KIND_STRUCT,
      subtypes: extraCols.map((_, i) => i + 1),
      fieldNames: extraCols,
    },
  ];
  for (const kind of colKinds) {
    types.push({ kind, subtypes: [], fieldNames: [] });
  }

  // Stripe info
  const stripeInfo: OrcStripeInfo = {
    offset: stripeOffset,
    indexLength: stripeIndexLen,
    dataLength: stripeDataLen,
    footerLength: sf.length,
    numberOfRows: nRows,
  };

  // File footer
  const footerBytes = encodeFooter([stripeInfo], types, nRows);
  for (const b of footerBytes) out.push(b);

  // File metadata (empty for now)
  const metaLen = 0;

  // Postscript
  const psBytes = encodePostscript(footerBytes.length, metaLen);
  for (const b of psBytes) out.push(b);

  // Postscript length (1 byte)
  if (psBytes.length > 255) throw new Error("ORC: postscript too large");
  out.push(psBytes.length);

  return new Uint8Array(out);
}
