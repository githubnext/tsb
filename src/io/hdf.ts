/**
 * readHdf / toHdf — HDF5 I/O for DataFrame.
 *
 * Implements a minimal HDF5 v0 (version 0 superblock) file format
 * compatible with pandas `read_hdf` / `to_hdf` and h5py.
 *
 * Supported column dtypes:
 *   - float64 / float32
 *   - int64 / int32 / int16 / int8
 *   - uint64 / uint32 / uint16 / uint8
 *   - bool (stored as uint8)
 *   - string (fixed-length null-padded UTF-8)
 *
 * Limitations (by design):
 *   - One DataFrame per file (single key/group)
 *   - No compression; contiguous storage
 *   - Max 120 columns per DataFrame
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Options for {@link readHdf}. */
export interface ReadHdfOptions {
  /** HDF5 group key (e.g. `"df"` or `"/df"`). Default: `"df"`. */
  readonly key?: string | null;
  /** Column to use as the row index. Default: `null` (RangeIndex). */
  readonly indexCol?: string | null;
  /** Subset of columns to read. Default: all. */
  readonly usecols?: readonly string[] | null;
}

/** Options for {@link toHdf}. */
export interface ToHdfOptions {
  /** HDF5 group key. Default: `"df"`. */
  readonly key?: string;
  /** Whether to write the DataFrame's row index as an extra column. Default: `false`. */
  readonly writeIndex?: boolean;
}

// ─── HDF5 Constants ───────────────────────────────────────────────────────────

/** HDF5 file signature: "\x89HDF\r\n\x1a\n" */
const HDF5_SIG = new Uint8Array([0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Undefined address sentinel (all bits set). */
const UNDEF = 0xffffffff_ffffffffn;

/** B-tree leaf-node K parameter. Each SNOD holds 2*K entries (max 8 for K=4). */
const K = 4;
const SNOD_ENTRIES = 2 * K; // 8 entries per SNOD

/** Object header message type codes. */
const MSG_DATASPACE = 0x0001;
const MSG_DATATYPE = 0x0003;
const MSG_DATA_LAYOUT = 0x0008;
const MSG_SYMBOL_TABLE = 0x0011;

/** Datatype class codes. */
const DT_FIXED_PT = 0; // integer
const DT_FLOAT = 1; // float
const DT_STRING = 5; // fixed-length string

// ─── Internal types ───────────────────────────────────────────────────────────

type ColKind =
  | "f64"
  | "f32"
  | "i64"
  | "i32"
  | "i16"
  | "i8"
  | "u64"
  | "u32"
  | "u16"
  | "u8"
  | "bool"
  | "str";

interface ColInfo {
  readonly name: string;
  readonly kind: ColKind;
  readonly elemSize: number; // bytes per element
  readonly maxStrLen: number; // for "str" kind; 0 otherwise
}

interface SnodEntry {
  readonly nameOff: bigint; // offset in parent local heap
  readonly oHdrAddr: bigint; // object header address
  readonly cacheType: number; // 0=data, 1=group
  readonly btreeAddr: bigint; // for groups
  readonly heapAddr: bigint; // for groups
}

// ─── Low-level byte writer ────────────────────────────────────────────────────

class BufWriter {
  private _buf: Uint8Array;
  private _view: DataView;
  private _pos: number;

  constructor(initialSize = 4096) {
    this._buf = new Uint8Array(initialSize);
    this._view = new DataView(this._buf.buffer);
    this._pos = 0;
  }

  get pos(): number {
    return this._pos;
  }

  private _grow(need: number): void {
    const required = this._pos + need;
    if (required <= this._buf.length) {
      return;
    }
    let size = this._buf.length;
    while (size < required) {
      size *= 2;
    }
    const next = new Uint8Array(size);
    next.set(this._buf.subarray(0, this._pos));
    this._buf = next;
    this._view = new DataView(this._buf.buffer);
  }

  u8(v: number): void {
    this._grow(1);
    this._view.setUint8(this._pos++, v & 0xff);
  }

  u16(v: number): void {
    this._grow(2);
    this._view.setUint16(this._pos, v & 0xffff, true);
    this._pos += 2;
  }

  u32(v: number): void {
    this._grow(4);
    this._view.setUint32(this._pos, v >>> 0, true);
    this._pos += 4;
  }

  u64(v: bigint): void {
    this._grow(8);
    this._view.setBigUint64(this._pos, BigInt.asUintN(64, v), true);
    this._pos += 8;
  }

  f32(v: number): void {
    this._grow(4);
    this._view.setFloat32(this._pos, v, true);
    this._pos += 4;
  }

  f64(v: number): void {
    this._grow(8);
    this._view.setFloat64(this._pos, v, true);
    this._pos += 8;
  }

  bytes(data: Uint8Array): void {
    this._grow(data.length);
    this._buf.set(data, this._pos);
    this._pos += data.length;
  }

  zeros(n: number): void {
    this._grow(n);
    this._buf.fill(0, this._pos, this._pos + n);
    this._pos += n;
  }

  /** Pad to an 8-byte boundary. */
  align8(): void {
    const rem = this._pos % 8;
    if (rem !== 0) {
      this.zeros(8 - rem);
    }
  }

  build(): Uint8Array {
    return this._buf.slice(0, this._pos);
  }
}

// ─── Layout calculation ───────────────────────────────────────────────────────

/** Compute element size, dtype kind, and max string length for a column. */
function inferColInfo(df: DataFrame, name: string): ColInfo {
  const series = df.col(name);
  const vals = series.values;
  const dtName = series.dtype.name;

  let kind: ColKind;
  let elemSize: number;
  let maxStrLen = 0;

  switch (dtName) {
    case "float64": {
      kind = "f64";
      elemSize = 8;
      break;
    }
    case "float32": {
      kind = "f32";
      elemSize = 4;
      break;
    }
    case "int64": {
      kind = "i64";
      elemSize = 8;
      break;
    }
    case "int32": {
      kind = "i32";
      elemSize = 4;
      break;
    }
    case "int16": {
      kind = "i16";
      elemSize = 2;
      break;
    }
    case "int8": {
      kind = "i8";
      elemSize = 1;
      break;
    }
    case "uint64": {
      kind = "u64";
      elemSize = 8;
      break;
    }
    case "uint32": {
      kind = "u32";
      elemSize = 4;
      break;
    }
    case "uint16": {
      kind = "u16";
      elemSize = 2;
      break;
    }
    case "uint8": {
      kind = "u8";
      elemSize = 1;
      break;
    }
    case "bool": {
      kind = "bool";
      elemSize = 1;
      break;
    }
    default: {
      // string / object → fixed-length UTF-8
      kind = "str";
      const enc = new TextEncoder();
      for (const v of vals) {
        const s = v == null ? "" : String(v);
        const len = enc.encode(s).length;
        if (len > maxStrLen) {
          maxStrLen = len;
        }
      }
      // Ensure at least 1 byte so element size >= 1
      if (maxStrLen === 0) {
        maxStrLen = 1;
      }
      elemSize = maxStrLen;
      break;
    }
  }

  return { name, kind, elemSize, maxStrLen };
}

/** Compute the heap data block for a local heap containing the given names. */
function buildHeapData(names: readonly string[]): Uint8Array {
  // Concatenate null-terminated names: first entry is always "" (empty root name)
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  for (const n of names) {
    const encoded = enc.encode(n);
    const part = new Uint8Array(encoded.length + 1);
    part.set(encoded);
    // last byte is already 0 (null terminator)
    parts.push(part);
  }
  let total = parts.reduce((s, p) => s + p.length, 0);
  // Pad to 8-byte boundary (minimum 8)
  if (total < 8) {
    total = 8;
  }
  const rem = total % 8;
  if (rem !== 0) {
    total += 8 - rem;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Find the byte offset of a null-terminated name in a heap data block. */
function heapOffset(heapData: Uint8Array, name: string): bigint {
  const enc = new TextEncoder();
  const target = enc.encode(name);
  outer: for (let i = 0; i < heapData.length - target.length; i++) {
    for (let j = 0; j < target.length; j++) {
      if (heapData[i + j] !== target[j]) {
        continue outer;
      }
    }
    // Check null terminator after match
    if (heapData[i + target.length] === 0) {
      return BigInt(i);
    }
  }
  return 0n;
}

// ─── HDF5 structure writers ───────────────────────────────────────────────────

/**
 * Write an HDF5 v0 Superblock at the current position.
 * Caller must patch eof_addr_pos and root_ohdr_pos after layout is known.
 */
function writeSuperblock(
  w: BufWriter,
  rootObjHdrAddr: bigint,
  rootBtreeAddr: bigint,
  rootHeapAddr: bigint,
  eofAddr: bigint,
): void {
  // Signature (8)
  w.bytes(HDF5_SIG);
  // Superblock version = 0 (1), free-space version = 0 (1),
  // root-group-entry version = 0 (1), reserved (1)
  w.u8(0);
  w.u8(0);
  w.u8(0);
  w.u8(0);
  // Shared-header-msg version = 0 (1), size-of-offsets = 8 (1),
  // size-of-lengths = 8 (1), reserved (1)
  w.u8(0);
  w.u8(8);
  w.u8(8);
  w.u8(0);
  // Group leaf K (2), group internal K (2)
  w.u16(K);
  w.u16(16);
  // File consistency flags (4)
  w.u32(0);
  // Base address (8)
  w.u64(0n);
  // Free-space address (8) = UNDEF
  w.u64(UNDEF);
  // EOF address (8)
  w.u64(eofAddr);
  // Driver info block address (8) = UNDEF
  w.u64(UNDEF);
  // Root group symbol table entry (40 bytes):
  //   link_name_offset (8) = 0 (= "" in the root heap)
  w.u64(0n);
  //   object header address (8)
  w.u64(rootObjHdrAddr);
  //   cache type = 1 (group) (4)
  w.u32(1);
  //   reserved (4)
  w.u32(0);
  //   scratch-pad: btree address (8), name-heap address (8)
  w.u64(rootBtreeAddr);
  w.u64(rootHeapAddr);
  // Total: 8+4+4+4+4+4*8 = 56 + 40 = 96 bytes
}

/**
 * Write an HDF5 v1 Object Header for a group (contains one Symbol Table message).
 * Returns the number of bytes written (always 40).
 */
function writeGroupObjHdr(w: BufWriter, btreeAddr: bigint, heapAddr: bigint): number {
  // Object Header Prefix (v1): version(1), reserved(1), num_msgs(2), ref_count(4), hdr_size(4) + pad(4)
  // Symbol Table message data size = 16 bytes.
  // Object header message entry = 8 (header) + 16 (data) = 24 bytes.
  // hdr_size = 24; total object header = 16 (prefix) + 24 (message) = 40 bytes.
  w.u8(1); // version = 1
  w.u8(0); // reserved
  w.u16(1); // 1 message
  w.u32(1); // ref count
  w.u32(24); // header data size (24 bytes = one message)
  w.u32(0); // reserved/pad (align prefix to 16 bytes)

  // Symbol Table Message (type 0x0011, size 16):
  w.u16(MSG_SYMBOL_TABLE);
  w.u16(16); // message data size
  w.u8(0); // flags
  w.u8(0);
  w.u8(0);
  w.u8(0); // reserved
  // Message data: btree_addr (8), heap_addr (8)
  w.u64(btreeAddr);
  w.u64(heapAddr);
  // Total: 16 + 24 = 40 bytes
  return 40;
}

/**
 * Write an HDF5 Local Heap.
 * heapData is the raw heap data block (pre-built by buildHeapData).
 * heapDataAddr is the absolute file address where heapData will be placed.
 */
function writeLocalHeap(w: BufWriter, heapData: Uint8Array, heapDataAddr: bigint): void {
  // Local Heap header (32 bytes):
  // signature "HEAP" (4), version (1), reserved (3), data_size (8), free_list (8), data_addr (8)
  w.u8(0x48);
  w.u8(0x45);
  w.u8(0x41);
  w.u8(0x50); // "HEAP"
  w.u8(0); // version
  w.u8(0);
  w.u8(0);
  w.u8(0); // reserved
  w.u64(BigInt(heapData.length)); // data segment size
  w.u64(UNDEF); // free list = UNDEF (no free space)
  w.u64(heapDataAddr); // address of data segment
}

/** Write the local heap data block. */
function writeLocalHeapData(w: BufWriter, heapData: Uint8Array): void {
  w.bytes(heapData);
}

/**
 * Write an HDF5 v1 B-tree Leaf Node for a group.
 * snodAddrs: list of SNOD absolute addresses.
 * keys: list of heap offsets to use as keys (length = snodAddrs.length + 1).
 */
function writeBtreeLeaf(w: BufWriter, snodAddrs: readonly bigint[], keys: readonly bigint[]): void {
  // "TREE" signature (4), node type = 0 (1), node level = 0 (1),
  // number of entries (2), left sibling (8), right sibling (8)
  w.u8(0x54);
  w.u8(0x52);
  w.u8(0x45);
  w.u8(0x45); // "TREE"
  w.u8(0); // node type = 0 (group)
  w.u8(0); // node level = 0 (leaf)
  w.u16(snodAddrs.length); // number of active entries
  w.u64(UNDEF); // left sibling
  w.u64(UNDEF); // right sibling

  // Keys and pointers interleaved: key[0], ptr[0], key[1], ptr[1], ..., key[n]
  for (let i = 0; i < snodAddrs.length; i++) {
    w.u64(keys[i] ?? 0n);
    w.u64(snodAddrs[i] ?? 0n);
  }
  w.u64(keys[snodAddrs.length] ?? 0n); // trailing key
}

/**
 * Write an HDF5 Symbol Table Node (SNOD).
 * entries: active SNOD entries (length <= 2*K).
 * Always writes exactly SNOD_ENTRIES = 2*K slot slots (pads unused with zeros).
 */
function writeSnod(w: BufWriter, entries: readonly SnodEntry[]): void {
  // "SNOD" signature (4), version (1), reserved (1), num_entries (2)
  w.u8(0x53);
  w.u8(0x4e);
  w.u8(0x4f);
  w.u8(0x44); // "SNOD"
  w.u8(1); // version = 1
  w.u8(0); // reserved
  w.u16(entries.length); // number of active entries

  // Write up to SNOD_ENTRIES symbol table entries (40 bytes each)
  for (let i = 0; i < SNOD_ENTRIES; i++) {
    if (i < entries.length) {
      const e = entries[i];
      if (e === undefined) {
        w.zeros(40);
        continue;
      }
      w.u64(e.nameOff); // link name offset in heap (8)
      w.u64(e.oHdrAddr); // object header address (8)
      w.u32(e.cacheType); // cache type (4)
      w.u32(0); // reserved (4)
      if (e.cacheType === 1) {
        // Group: scratch-pad = btree_addr (8) + heap_addr (8)
        w.u64(e.btreeAddr);
        w.u64(e.heapAddr);
      } else {
        // Data/dataset: scratch-pad = zeros (16)
        w.zeros(16);
      }
    } else {
      // Unused slot: 40 bytes of zeros
      w.zeros(40);
    }
  }
  // SNOD total: 8 + SNOD_ENTRIES * 40 bytes = 8 + 8*40 = 328 bytes
}

/** Write the HDF5 datatype message DATA for a given column kind. Returns the data size. */
function writeDatatypeData(w: BufWriter, info: ColInfo): number {
  const kind = info.kind;

  if (kind === "f64" || kind === "f32") {
    // Class 1 (float), version 1: 24 bytes
    // Byte 0: (1<<4)|1 = 0x11
    // Byte 1: 0x20 = IEEE implied MSB normalization, little-endian
    w.u8(0x11);
    w.u8(0x20);
    w.u8(0x00);
    w.u8(0x00);
    w.u32(info.elemSize); // element size
    if (kind === "f64") {
      // IEEE 754 double: exponent at bit 52 (11 bits), mantissa at bit 0 (52 bits), bias=1023
      w.u16(52);
      w.u16(0); // exponent_offset=52, mantissa_offset=0
      w.u8(11);
      w.u8(52); // exponent_bits=11, mantissa_bits=52
      w.u32(1023); // exponent bias
    } else {
      // IEEE 754 single: exponent at bit 23 (8 bits), mantissa at bit 0 (23 bits), bias=127
      w.u16(23);
      w.u16(0); // exponent_offset=23, mantissa_offset=0
      w.u8(8);
      w.u8(23); // exponent_bits=8, mantissa_bits=23
      w.u32(127); // exponent bias
    }
    w.zeros(6); // padding to 24 bytes (8 header + 10 props + 6 pad = 24)
    return 24;
  }

  if (kind === "str") {
    // Class 5 (string), version 1: 8 bytes
    // Byte 0: (1<<4)|5 = 0x15
    // Byte 1: padding=1 (null-padded) in bits 0-3, charset=1 (UTF-8) in bits 4-7 → 0x11
    w.u8(0x15);
    w.u8(0x11);
    w.u8(0x00);
    w.u8(0x00);
    w.u32(info.elemSize); // element size = max string length
    return 8;
  }

  // Class 0 (fixed-point integer / bool): 16 bytes
  // Byte 0: (1<<4)|0 = 0x10
  const signed = kind === "i64" || kind === "i32" || kind === "i16" || kind === "i8";
  // Byte 1: bit6=signed, bit0=LE → 0x40 for signed, 0x00 for unsigned
  const bf0 = signed ? 0x40 : 0x00;
  w.u8(0x10);
  w.u8(bf0);
  w.u8(0x00);
  w.u8(0x00);
  w.u32(info.elemSize); // element size in bytes
  // Properties: bit_offset (2 bytes = 0), num_bits (2 bytes = elemSize*8)
  w.u16(0); // bit offset = 0
  w.u16(info.elemSize * 8); // number of bits
  w.zeros(4); // padding to 16 bytes (8 + 4 props + 4 pad = 16)
  return 16;
}

/** Write an HDF5 v1 Object Header for a dataset column. */
function writeDatasetObjHdr(w: BufWriter, info: ColInfo, nRows: number, dataAddr: bigint): void {
  // Compute type data size
  const tempW = new BufWriter(64);
  const typDataSize = writeDatatypeData(tempW, info);

  const dataSize = BigInt(nRows * info.elemSize);

  // Message counts:
  // 1. Datatype message: 8 + typDataSize bytes
  // 2. Dataspace message: 8 + 24 = 32 bytes
  // 3. Data Layout message: 8 + 24 = 32 bytes
  const hdrDataSize = 8 + typDataSize + 32 + 32;

  // Object Header Prefix (16 bytes):
  w.u8(1);
  w.u8(0); // version, reserved
  w.u16(3); // 3 messages
  w.u32(1); // ref count
  w.u32(hdrDataSize); // header data size
  w.u32(0); // pad (to 16 bytes)

  // --- Datatype message ---
  w.u16(MSG_DATATYPE);
  w.u16(typDataSize); // message data size
  w.u8(1); // flags: "constant" (bit 0)
  w.u8(0);
  w.u8(0);
  w.u8(0); // reserved
  writeDatatypeData(w, info);

  // --- Dataspace message (Simple, 1D, with max dims) ---
  // Data: version(1), rank(1), flags(1), type(1), reserved(4), dim0(8), maxdim0(8) = 24 bytes
  w.u16(MSG_DATASPACE);
  w.u16(24); // message data size
  w.u8(0); // flags
  w.u8(0);
  w.u8(0);
  w.u8(0); // reserved
  w.u8(1); // version = 1
  w.u8(1); // rank = 1 (1D)
  w.u8(1); // flags = 0x01 (max dimensions present)
  w.u8(0); // type = 0 (simple)
  w.u32(0); // reserved
  w.u64(BigInt(nRows)); // dimension 0 size
  w.u64(UNDEF); // max dimension 0 = unlimited

  // --- Data Layout message (contiguous, v1) ---
  // Data: version(1), class(1), reserved(6), addr(8), data_size(8) = 24 bytes
  w.u16(MSG_DATA_LAYOUT);
  w.u16(24); // message data size
  w.u8(0); // flags
  w.u8(0);
  w.u8(0);
  w.u8(0); // reserved
  w.u8(1); // version = 1
  w.u8(1); // layout class = 1 (contiguous)
  w.zeros(6); // reserved
  w.u64(dataAddr); // data address
  w.u64(dataSize); // data size in bytes
}

/** Encode a single column value to a Uint8Array according to ColInfo. */
function encodeColData(w: BufWriter, series: { values: readonly unknown[] }, info: ColInfo): void {
  const vals = series.values;
  const enc = new TextEncoder();

  for (const raw of vals) {
    switch (info.kind) {
      case "f64": {
        const v =
          raw == null || (typeof raw === "number" && Number.isNaN(raw)) ? Number.NaN : Number(raw);
        w.f64(v);
        break;
      }
      case "f32": {
        const v = raw == null ? Number.NaN : Number(raw);
        w.f32(v);
        break;
      }
      case "i64": {
        const v = raw == null ? 0n : BigInt(Math.trunc(Number(raw)));
        w.u64(v);
        break;
      }
      case "i32": {
        w.u32(raw == null ? 0 : Number(raw) | 0);
        break;
      }
      case "i16": {
        const v = raw == null ? 0 : Number(raw) | 0;
        w.u8(v & 0xff);
        w.u8((v >> 8) & 0xff);
        break;
      }
      case "i8": {
        w.u8(raw == null ? 0 : Number(raw) | 0);
        break;
      }
      case "u64": {
        const v = raw == null ? 0n : BigInt(Math.abs(Math.trunc(Number(raw))));
        w.u64(v);
        break;
      }
      case "u32": {
        w.u32(raw == null ? 0 : Math.abs(Number(raw)) >>> 0);
        break;
      }
      case "u16": {
        const v = raw == null ? 0 : Math.abs(Number(raw)) & 0xffff;
        w.u8(v & 0xff);
        w.u8((v >> 8) & 0xff);
        break;
      }
      case "u8": {
        w.u8(raw == null ? 0 : Math.abs(Number(raw)) & 0xff);
        break;
      }
      case "bool": {
        w.u8(raw ? 1 : 0);
        break;
      }
      case "str": {
        const s = raw == null ? "" : String(raw);
        const encoded = enc.encode(s);
        const buf = new Uint8Array(info.elemSize);
        buf.set(encoded.subarray(0, info.elemSize));
        w.bytes(buf);
        break;
      }
    }
  }
  w.align8();
}

// ─── toHdf ────────────────────────────────────────────────────────────────────

/**
 * Serialize a DataFrame to an HDF5 v0 binary buffer.
 *
 * @example
 * ```ts
 * import { DataFrame, toHdf, readHdf } from "tsb";
 * const df = DataFrame.fromColumns({ x: [1, 2, 3], y: [4.0, 5.0, 6.0] });
 * const buf = toHdf(df);
 * const df2 = readHdf(buf);
 * ```
 */
export function toHdf(df: DataFrame, options?: ToHdfOptions): Uint8Array {
  const keyRaw = options?.key ?? "df";
  const key = keyRaw.replace(/^\/+/, "");
  const writeIndex = options?.writeIndex ?? false;

  // Build column list
  const colNames: string[] = writeIndex
    ? ["__index__", ...df.columns.values]
    : [...df.columns.values];
  const nCols = colNames.length;
  const nRows = df.shape[0];

  if (nCols === 0) {
    throw new Error("toHdf: DataFrame must have at least one column");
  }
  if (nCols > 120) {
    throw new Error(`toHdf: max 120 columns supported (got ${nCols})`);
  }

  // Build ColInfo for each column
  const colInfos: ColInfo[] = colNames.map((name, i) => {
    if (writeIndex && i === 0) {
      // Index column: treat as string
      return { name, kind: "str" as ColKind, elemSize: 8, maxStrLen: 8 };
    }
    return inferColInfo(df, name);
  });

  // ── Compute heap data ──────────────────────────────────────────────────────

  // Root heap: ["", key]
  const rootHeapData = buildHeapData(["", key]);
  // Key heap: ["", ...colNames]
  const keyHeapData = buildHeapData(["", ...colNames]);

  // ── Compute layout ─────────────────────────────────────────────────────────

  const nSnods = Math.ceil(nCols / SNOD_ENTRIES);
  // B-tree size: 24 (fixed) + (nSnods+1)*8 (keys) + nSnods*8 (pointers)
  const rootBtreeSize = 24 + 3 * 8; // always 1 SNOD for root (key group)
  const keyBtreeSize = 24 + (nSnods + 1) * 8 + nSnods * 8;
  const snodSize = 8 + SNOD_ENTRIES * 40; // 328 for K=4

  // Dataset object header sizes
  const colObjHdrSizes: number[] = colInfos.map((ci) => {
    const tempW = new BufWriter(64);
    const typDataSz = writeDatatypeData(tempW, ci);
    // 16 (prefix) + (8+typDataSz) + 32 + 32
    return 16 + 8 + typDataSz + 32 + 32;
  });

  // Align data sizes to 8 bytes
  const colDataSizes: number[] = colInfos.map((ci) => {
    const raw = nRows * ci.elemSize;
    const rem = raw % 8;
    return rem === 0 ? (raw === 0 ? 8 : raw) : raw + (8 - rem);
  });

  // ── Assign offsets ─────────────────────────────────────────────────────────

  let cur = 0;

  cur += 96; // superblock
  const offRootObjHdr = cur;
  cur += 40;
  const offRootHeapHdr = cur;
  cur += 32;
  const offRootHeapData = cur;
  cur += rootHeapData.length;
  const offRootBtree = cur;
  cur += rootBtreeSize;
  const offRootSnod = cur;
  cur += snodSize;

  const offKeyObjHdr = cur;
  cur += 40;
  const offKeyHeapHdr = cur;
  cur += 32;
  const offKeyHeapData = cur;
  cur += keyHeapData.length;
  const offKeyBtree = cur;
  cur += keyBtreeSize;
  const offKeySnods = cur;
  cur += nSnods * snodSize;

  const offColObjHdrs: number[] = [];
  const offColData: number[] = [];
  for (let i = 0; i < nCols; i++) {
    offColObjHdrs.push(cur);
    cur += colObjHdrSizes[i] ?? 0;
    offColData.push(cur);
    cur += colDataSizes[i] ?? 0;
  }

  const eofAddr = cur;

  // ── Write ──────────────────────────────────────────────────────────────────

  const w = new BufWriter(Math.max(eofAddr * 2, 4096));

  // Superblock
  writeSuperblock(
    w,
    BigInt(offRootObjHdr),
    BigInt(offRootBtree),
    BigInt(offRootHeapHdr),
    BigInt(eofAddr),
  );

  // Root group object header
  writeGroupObjHdr(w, BigInt(offRootBtree), BigInt(offRootHeapHdr));

  // Root local heap header + data
  writeLocalHeap(w, rootHeapData, BigInt(offRootHeapData));
  writeLocalHeapData(w, rootHeapData);

  // Root B-tree leaf node (1 SNOD pointing to key group entries)
  writeBtreeLeaf(w, [BigInt(offRootSnod)], [0n, BigInt(rootHeapData.length)]);

  // Root SNOD (1 active entry: the key group)
  const keyHeapOffset = heapOffset(rootHeapData, key);
  writeSnod(w, [
    {
      nameOff: keyHeapOffset,
      oHdrAddr: BigInt(offKeyObjHdr),
      cacheType: 1, // group
      btreeAddr: BigInt(offKeyBtree),
      heapAddr: BigInt(offKeyHeapHdr),
    },
  ]);

  // Key group object header
  writeGroupObjHdr(w, BigInt(offKeyBtree), BigInt(offKeyHeapHdr));

  // Key local heap header + data
  writeLocalHeap(w, keyHeapData, BigInt(offKeyHeapData));
  writeLocalHeapData(w, keyHeapData);

  // Key B-tree leaf node
  // Sort column names lexicographically for B-tree key ordering
  const sortedColNames = [...colNames].sort();
  // Compute keys: heap offsets that bound each SNOD's entries
  const btreeKeys: bigint[] = [0n];
  for (let si = 1; si < nSnods; si++) {
    // First name in SNOD si
    const firstName = sortedColNames[si * SNOD_ENTRIES];
    btreeKeys.push(heapOffset(keyHeapData, firstName ?? ""));
  }
  btreeKeys.push(BigInt(keyHeapData.length));

  const snodAddresses = Array.from({ length: nSnods }, (_, i) =>
    BigInt(offKeySnods + i * snodSize),
  );
  writeBtreeLeaf(w, snodAddresses, btreeKeys);

  // Key SNODs (sorted by name within each SNOD for B-tree correctness)
  // Map sorted name → original index
  const nameToIdx = new Map<string, number>(colNames.map((n, i) => [n, i]));
  for (let si = 0; si < nSnods; si++) {
    const sliceStart = si * SNOD_ENTRIES;
    const sliceEnd = Math.min(sliceStart + SNOD_ENTRIES, nCols);
    const entries: SnodEntry[] = [];
    for (let j = sliceStart; j < sliceEnd; j++) {
      const name = sortedColNames[j];
      if (name === undefined) {
        break;
      }
      const origIdx = nameToIdx.get(name) ?? 0;
      entries.push({
        nameOff: heapOffset(keyHeapData, name),
        oHdrAddr: BigInt(offColObjHdrs[origIdx] ?? 0),
        cacheType: 0, // dataset
        btreeAddr: 0n,
        heapAddr: 0n,
      });
    }
    writeSnod(w, entries);
  }

  // Column dataset object headers and data
  for (let i = 0; i < nCols; i++) {
    const ci = colInfos[i];
    if (ci === undefined) {
      continue;
    }
    const dataAddr = offColData[i] ?? 0;
    writeDatasetObjHdr(w, ci, nRows, BigInt(dataAddr));

    // Write column data
    if (writeIndex && i === 0) {
      // Index: write as strings
      const enc = new TextEncoder();
      const idxVals = df.index.values;
      for (const v of idxVals) {
        const s = v == null ? "" : String(v);
        const encoded = enc.encode(s);
        const buf = new Uint8Array(ci.elemSize);
        buf.set(encoded.subarray(0, ci.elemSize));
        w.bytes(buf);
      }
      w.align8();
    } else {
      encodeColData(w, df.col(colNames[i] ?? ""), ci);
    }
  }

  return w.build();
}

// ─── HDF5 reader helpers ──────────────────────────────────────────────────────

class HdfReader {
  private readonly view: DataView;
  private readonly raw: Uint8Array;

  constructor(data: Uint8Array) {
    this.raw = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  private r8(off: number): number {
    return this.view.getUint8(off);
  }
  private r16(off: number): number {
    return this.view.getUint16(off, true);
  }
  private r32(off: number): number {
    return this.view.getUint32(off, true);
  }
  private r64(off: number): bigint {
    return this.view.getBigUint64(off, true);
  }
  private rs32(off: number): number {
    return this.view.getInt32(off, true);
  }
  private ri64(off: number): bigint {
    return this.view.getBigInt64(off, true);
  }

  /** Read a null-terminated string from the given offset. */
  private readCStr(off: number): string {
    let end = off;
    while (end < this.raw.length && this.raw[end] !== 0) {
      end++;
    }
    return new TextDecoder().decode(this.raw.subarray(off, end));
  }

  /** Parse superblock and return root group info. */
  parseSuperblock(): {
    rootObjHdrAddr: bigint;
    rootBtreeAddr: bigint;
    rootHeapAddr: bigint;
  } {
    // Validate signature
    for (let i = 0; i < 8; i++) {
      if (this.r8(i) !== (HDF5_SIG[i] ?? 0)) {
        throw new Error("readHdf: invalid HDF5 signature");
      }
    }
    const sbVer = this.r8(8);
    if (sbVer !== 0) {
      throw new Error(`readHdf: unsupported superblock version ${sbVer} (only v0 supported)`);
    }
    // offset_size is at byte 13
    const offsetSize = this.r8(13);
    if (offsetSize !== 8) {
      throw new Error(
        `readHdf: unsupported offset size ${offsetSize} (only 8-byte offsets supported)`,
      );
    }
    // Root group symbol table entry starts at offset 56:
    // link_name_off (8), obj_hdr_addr (8), cache_type (4), reserved (4),
    // btree_addr (8), heap_addr (8)
    const rootObjHdrAddr = this.r64(64);
    const rootBtreeAddr = this.r64(80);
    const rootHeapAddr = this.r64(88);
    return { rootObjHdrAddr, rootBtreeAddr, rootHeapAddr };
  }

  /**
   * Read the children of a group, returning {name, oHdrAddr, isGroup, childBtree, childHeap} for each.
   */
  readGroupChildren(
    _oHdrAddr: bigint,
    btreeAddr: bigint,
    heapAddr: bigint,
  ): Array<{
    name: string;
    oHdrAddr: bigint;
    isGroup: boolean;
    btreeAddr: bigint;
    heapAddr: bigint;
  }> {
    // Read heap data block address and size
    const heapOff = Number(heapAddr);
    // "HEAP" signature check
    if (
      this.r8(heapOff) !== 0x48 ||
      this.r8(heapOff + 1) !== 0x45 ||
      this.r8(heapOff + 2) !== 0x41 ||
      this.r8(heapOff + 3) !== 0x50
    ) {
      throw new Error("readHdf: invalid local heap signature");
    }
    const heapDataAddr = Number(this.r64(heapOff + 24));

    // Walk B-tree to collect SNOD addresses
    const snodAddrs = this.walkBtree(btreeAddr);

    // Read each SNOD
    const result: Array<{
      name: string;
      oHdrAddr: bigint;
      isGroup: boolean;
      btreeAddr: bigint;
      heapAddr: bigint;
    }> = [];
    for (const snodAddr of snodAddrs) {
      const off = Number(snodAddr);
      // Validate "SNOD"
      if (
        this.r8(off) !== 0x53 ||
        this.r8(off + 1) !== 0x4e ||
        this.r8(off + 2) !== 0x4f ||
        this.r8(off + 3) !== 0x44
      ) {
        throw new Error("readHdf: invalid SNOD signature");
      }
      const nEntries = this.r16(off + 6);
      for (let i = 0; i < nEntries; i++) {
        const entryOff = off + 8 + i * 40;
        const nameOff = Number(this.r64(entryOff));
        const oHdrAddr = this.r64(entryOff + 8);
        const cacheType = this.r32(entryOff + 16);
        const name = this.readCStr(heapDataAddr + nameOff);
        let childBtree = 0n;
        let childHeap = 0n;
        if (cacheType === 1) {
          childBtree = this.r64(entryOff + 24);
          childHeap = this.r64(entryOff + 32);
        }
        result.push({
          name,
          oHdrAddr,
          isGroup: cacheType === 1,
          btreeAddr: childBtree,
          heapAddr: childHeap,
        });
      }
    }
    return result;
  }

  /** Walk a B-tree and collect all SNOD addresses (leaf pointers). */
  private walkBtree(btreeAddr: bigint): bigint[] {
    const off = Number(btreeAddr);
    // Validate "TREE"
    if (
      this.r8(off) !== 0x54 ||
      this.r8(off + 1) !== 0x52 ||
      this.r8(off + 2) !== 0x45 ||
      this.r8(off + 3) !== 0x45
    ) {
      throw new Error("readHdf: invalid B-tree signature");
    }
    const nodeLevel = this.r8(off + 5);
    const nEntries = this.r16(off + 6);
    // off+8: left sibling, off+16: right sibling
    // off+24: keys and pointers begin

    if (nodeLevel === 0) {
      // Leaf node: pointers are SNOD addresses
      const snods: bigint[] = [];
      for (let i = 0; i < nEntries; i++) {
        // Keys and pointers interleaved: key[i] at off+24 + i*16, ptr[i] at off+24 + i*16 + 8
        const snodAddr = this.r64(off + 24 + i * 16 + 8);
        snods.push(snodAddr);
      }
      return snods;
    }
    // Internal node: pointers are child B-tree nodes
    const result: bigint[] = [];
    for (let i = 0; i < nEntries; i++) {
      const childAddr = this.r64(off + 24 + i * 16 + 8);
      result.push(...this.walkBtree(childAddr));
    }
    return result;
  }

  /** Parse an object header and extract the Symbol Table message (for groups). */
  parseGroupSymbolTable(oHdrAddr: bigint): { btreeAddr: bigint; heapAddr: bigint } {
    const off = Number(oHdrAddr);
    const ver = this.r8(off);
    if (ver !== 1) {
      throw new Error(`readHdf: unsupported object header version ${ver}`);
    }
    const nMsgs = this.r16(off + 2);
    const hdrDataSize = this.r32(off + 8);
    let msgOff = off + 16;
    const msgEnd = off + 16 + hdrDataSize;

    for (let m = 0; m < nMsgs; m++) {
      if (msgOff + 8 > msgEnd) {
        break;
      }
      const msgType = this.r16(msgOff);
      const msgSize = this.r16(msgOff + 2);
      if (msgType === MSG_SYMBOL_TABLE) {
        const btreeAddr = this.r64(msgOff + 8);
        const heapAddr = this.r64(msgOff + 16);
        return { btreeAddr, heapAddr };
      }
      msgOff += 8 + msgSize;
    }
    throw new Error("readHdf: Symbol Table message not found in group object header");
  }

  /** Parse a dataset object header and extract data address + shape + type info. */
  parseDataset(oHdrAddr: bigint): {
    dataAddr: bigint;
    nElements: number;
    kind: ColKind;
    elemSize: number;
  } {
    const off = Number(oHdrAddr);
    const ver = this.r8(off);
    if (ver !== 1) {
      throw new Error(`readHdf: unsupported object header version ${ver}`);
    }
    const nMsgs = this.r16(off + 2);
    const hdrDataSize = this.r32(off + 8);
    let msgOff = off + 16;
    const msgEnd = off + 16 + hdrDataSize;

    let dataAddr = 0n;
    let nElements = 0;
    let kind: ColKind = "f64";
    let elemSize = 8;

    for (let m = 0; m < nMsgs; m++) {
      if (msgOff + 8 > msgEnd) {
        break;
      }
      const msgType = this.r16(msgOff);
      const msgSize = this.r16(msgOff + 2);
      const dataOff = msgOff + 8;

      if (msgType === MSG_DATASPACE) {
        // Dataspace: version(1), rank(1), flags(1), type(1), reserved(4), dims...
        const rank = this.r8(dataOff + 1);
        if (rank >= 1) {
          nElements = Number(this.r64(dataOff + 8));
        }
      } else if (msgType === MSG_DATATYPE) {
        // Datatype: (version<<4)|class (1), bit_fields (3), element_size (4)
        const classByte = this.r8(dataOff);
        const dtClass = classByte & 0x0f;
        elemSize = this.r32(dataOff + 4);
        const bf0 = this.r8(dataOff + 1);

        if (dtClass === DT_FLOAT) {
          kind = elemSize === 4 ? "f32" : "f64";
        } else if (dtClass === DT_STRING) {
          kind = "str";
        } else if (dtClass === DT_FIXED_PT) {
          const signed = (bf0 & 0x40) !== 0;
          if (elemSize === 8) {
            kind = signed ? "i64" : "u64";
          } else if (elemSize === 4) {
            kind = signed ? "i32" : "u32";
          } else if (elemSize === 2) {
            kind = signed ? "i16" : "u16";
          } else {
            kind = signed ? "i8" : "u8";
          }
        }
      } else if (msgType === MSG_DATA_LAYOUT) {
        // Layout: version(1), class(1), reserved(6), addr(8), size(8)
        const layoutClass = this.r8(dataOff + 1);
        if (layoutClass === 1) {
          // Contiguous
          dataAddr = this.r64(dataOff + 8);
        }
      }
      msgOff += 8 + msgSize;
    }

    return { dataAddr, nElements, kind, elemSize };
  }

  /** Read column data from a dataset. */
  readDatasetValues(
    dataAddr: bigint,
    nElements: number,
    kind: ColKind,
    elemSize: number,
  ): Scalar[] {
    const off = Number(dataAddr);
    const dec = new TextDecoder();
    const vals: Scalar[] = [];

    for (let i = 0; i < nElements; i++) {
      const p = off + i * elemSize;
      switch (kind) {
        case "f64":
          vals.push(this.view.getFloat64(p, true));
          break;
        case "f32":
          vals.push(this.view.getFloat32(p, true));
          break;
        case "i64":
          vals.push(Number(this.ri64(p)));
          break;
        case "i32":
          vals.push(this.rs32(p));
          break;
        case "i16":
          vals.push(this.view.getInt16(p, true));
          break;
        case "i8":
          vals.push(this.view.getInt8(p));
          break;
        case "u64":
          vals.push(Number(this.r64(p)));
          break;
        case "u32":
          vals.push(this.r32(p));
          break;
        case "u16":
          vals.push(this.r16(p));
          break;
        case "u8":
        case "bool":
          vals.push(this.r8(p));
          break;
        case "str": {
          // Fixed-length null-padded string
          let end = p + elemSize;
          while (end > p && this.raw[end - 1] === 0) {
            end--;
          }
          vals.push(dec.decode(this.raw.subarray(p, end)));
          break;
        }
      }
    }
    return vals;
  }
}

// ─── readHdf ──────────────────────────────────────────────────────────────────

/**
 * Parse an HDF5 v0 binary buffer into a DataFrame.
 *
 * @example
 * ```ts
 * import { readHdf } from "tsb";
 * const df = readHdf(buffer, { key: "df" });
 * ```
 */
export function readHdf(data: Uint8Array, options?: ReadHdfOptions): DataFrame {
  const keyRaw = options?.key ?? "df";
  const key = keyRaw.replace(/^\/+/, "");
  const indexCol = options?.indexCol ?? null;
  const usecols = options?.usecols ?? null;

  const reader = new HdfReader(data);

  // Parse superblock
  const { rootObjHdrAddr, rootBtreeAddr, rootHeapAddr } = reader.parseSuperblock();

  // Read root group children — find the key group
  const rootChildren = reader.readGroupChildren(rootObjHdrAddr, rootBtreeAddr, rootHeapAddr);
  const keyEntry = rootChildren.find((c) => c.name === key);
  if (!keyEntry) {
    const available = rootChildren.map((c) => c.name).join(", ");
    throw new Error(`readHdf: key "${key}" not found. Available keys: [${available}]`);
  }

  if (!keyEntry.isGroup) {
    throw new Error(`readHdf: key "${key}" is not a group`);
  }

  // Read key group symbol table to get its B-tree and heap
  const { btreeAddr: keyBtreeAddr, heapAddr: keyHeapAddr } = reader.parseGroupSymbolTable(
    keyEntry.oHdrAddr,
  );

  // Read key group children — each is a column dataset
  const colEntries = reader.readGroupChildren(keyEntry.oHdrAddr, keyBtreeAddr, keyHeapAddr);

  // Build columns
  const columns: Record<string, readonly Scalar[]> = {};
  for (const entry of colEntries) {
    if (entry.isGroup) {
      continue; // skip sub-groups
    }
    if (usecols !== null && !usecols.includes(entry.name)) {
      continue;
    }

    const ds = reader.parseDataset(entry.oHdrAddr);
    const vals = reader.readDatasetValues(ds.dataAddr, ds.nElements, ds.kind, ds.elemSize);
    columns[entry.name] = vals;
  }

  // Handle indexCol: remove from columns, use as row index
  let idxLabels: Label[] | null = null;
  if (indexCol !== null && indexCol in columns) {
    const rawVals = columns[indexCol];
    if (rawVals !== undefined) {
      idxLabels = rawVals as Label[];
      delete columns[indexCol];
    }
  }

  if (idxLabels !== null) {
    const rowIndex = new Index<Label>(idxLabels);
    return DataFrame.fromColumns(columns, { index: rowIndex });
  }
  return DataFrame.fromColumns(columns);
}
