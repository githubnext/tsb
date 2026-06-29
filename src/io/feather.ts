/**
 * readFeather / toFeather — Apache Arrow Feather v2 (IPC file) I/O for DataFrame.
 *
 * Mirrors `pandas.read_feather()` and `DataFrame.to_feather()`:
 * - `readFeather(data, options?)` — parse an Arrow IPC binary buffer into a DataFrame
 * - `toFeather(df, options?)` — serialize a DataFrame to an Arrow IPC binary buffer
 *
 * Supported column types:
 * - Writing: int64 (all integer dtypes), float64, float32, bool, utf8
 * - Reading: Int8/16/32/64, UInt8/16/32/64, Float32/64, Bool, Utf8/LargeUtf8
 *
 * Null values are fully supported via Arrow validity bitmaps.
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Options for {@link readFeather}. */
export interface ReadFeatherOptions {
  /** Column to use as the row index. Default: `null` (RangeIndex). */
  readonly indexCol?: string | null;
  /** Subset of columns to read. Default: all. */
  readonly usecols?: readonly string[] | null;
}

/** Options for {@link toFeather}. */
export interface ToFeatherOptions {
  /**
   * Write the DataFrame's row index as an extra column.
   * Default: `false`.
   */
  readonly writeIndex?: boolean;
}

// ─── Arrow constants ──────────────────────────────────────────────────────────

const MAGIC = new Uint8Array([0x41, 0x52, 0x52, 0x4f, 0x57, 0x31, 0x00, 0x00]); // "ARROW1\0\0"
const CONTINUATION_I32 = -1; // 0xFFFFFFFF interpreted as int32

// MetadataVersion V5
const META_V5 = 4;

// MessageHeader union type discriminants
const MSG_SCHEMA = 1;
const MSG_RECORD_BATCH = 3;

// Arrow type union discriminants (Field.type_type)
const TYPE_INT = 2;
const TYPE_FLOAT = 3;
const TYPE_UTF8 = 5;
const TYPE_BOOL = 6;
const TYPE_LARGE_UTF8 = 13;

// FloatingPoint precision
const PREC_SINGLE = 1;
const PREC_DOUBLE = 2;

// Endianness
const ENDIAN_LITTLE = 0;

// ─── Column type descriptor ───────────────────────────────────────────────────

type ColType =
  | { kind: "int"; bitWidth: number; isSigned: boolean }
  | { kind: "float"; precision: number }
  | { kind: "bool" }
  | { kind: "utf8" };

// ─── FlatBuffer backward builder ──────────────────────────────────────────────

/**
 * Minimal backward FlatBuffer builder for Arrow IPC FlatBuffer structures.
 *
 * In a backward builder the head pointer decreases as data is written;
 * the final slice is `buf[head:]`. Every "absolute index" is the byte position
 * within `buf` of a written value.  uoffset_t values are positive distances
 * from the field position to the target; soffset_t (vtable pointer) values can
 * be negative (vtable before table body in the output slice).
 */
class FbBuilder {
  private buf: Uint8Array;
  private view: DataView;
  /** First written byte (decrements as data is prepended). */
  private head: number;

  constructor(initialSize = 1024) {
    this.buf = new Uint8Array(initialSize);
    this.view = new DataView(this.buf.buffer);
    this.head = initialSize;
  }

  // ── internal helpers ───────────────────────────────────────────────────────

  private grow(n: number): void {
    while (this.head < n) {
      const nb = new Uint8Array(this.buf.length * 2);
      nb.set(this.buf, this.buf.length); // old data at END of new buffer → OFEs are stable
      this.head += this.buf.length;
      this.buf = nb;
      this.view = new DataView(this.buf.buffer);
    }
  }

  private align(a: number): void {
    const used = this.buf.length - this.head;
    const rem = used % a;
    if (rem !== 0) {
      const p = a - rem;
      this.grow(p);
      this.head -= p;
    }
  }

  // ── primitive writes (each returns absolute index of written value) ─────────

  writeU8(v: number): number {
    this.grow(1);
    this.buf[--this.head] = v & 0xff;
    return this.head;
  }

  writeU16(v: number): number {
    this.align(2);
    this.grow(2);
    this.head -= 2;
    this.view.setUint16(this.head, v, true);
    return this.head;
  }

  writeI16(v: number): number {
    this.align(2);
    this.grow(2);
    this.head -= 2;
    this.view.setInt16(this.head, v, true);
    return this.head;
  }

  writeI32(v: number): number {
    this.align(4);
    this.grow(4);
    this.head -= 4;
    this.view.setInt32(this.head, v, true);
    return this.head;
  }

  writeI64(v: bigint): number {
    this.align(8);
    this.grow(8);
    this.head -= 8;
    this.view.setBigInt64(this.head, v, true);
    return this.head;
  }

  writeUOffset(targetAbsIdx: number): number {
    this.align(4);
    this.grow(4);
    this.head -= 4;
    this.view.setUint32(this.head, targetAbsIdx - this.head, true);
    return this.head;
  }

  // ── composite writers ──────────────────────────────────────────────────────

  createString(s: string): number {
    const bytes = new TextEncoder().encode(s);
    const N = bytes.length;
    // Pre-align so that after writing null(1) + bytes(N), the position is
    // 4-byte aligned relative to the buffer end. This ensures writeI32 adds
    // no extra padding between the length prefix and the string bytes.
    const used = this.buf.length - this.head;
    const pad = (4 - ((used + N + 1) % 4)) % 4;
    for (let i = 0; i < pad; i++) {
      this.grow(1);
      this.buf[--this.head] = 0;
    }
    this.grow(1);
    this.buf[--this.head] = 0; // null terminator
    for (let i = N - 1; i >= 0; i--) {
      this.grow(1);
      this.buf[--this.head] = bytes[i]!;
    }
    return this.writeI32(N); // write length prefix (int32, align is now a no-op)
  }

  /** Offset vector (uoffset_t[] preceded by u32 count). */
  createOffsetVector(absIdxs: number[]): number {
    this.align(4);
    for (let i = absIdxs.length - 1; i >= 0; i--) {
      this.writeUOffset(absIdxs[i]!);
    }
    return this.writeI32(absIdxs.length);
  }

  /** Inline FieldNode vector ({length:i64, null_count:i64}×n preceded by u32 count). */
  createFieldNodeVector(nodes: ReadonlyArray<{ length: bigint; nullCount: bigint }>): number {
    this.align(8);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]!;
      this.grow(8);
      this.head -= 8;
      this.view.setBigInt64(this.head, n.nullCount, true);
      this.grow(8);
      this.head -= 8;
      this.view.setBigInt64(this.head, n.length, true);
    }
    return this.writeI32(nodes.length);
  }

  /** Inline Buffer vector ({offset:i64, length:i64}×n preceded by u32 count). */
  createBufferVector(bufs: ReadonlyArray<{ offset: bigint; length: bigint }>): number {
    this.align(8);
    for (let i = bufs.length - 1; i >= 0; i--) {
      const b = bufs[i]!;
      this.grow(8);
      this.head -= 8;
      this.view.setBigInt64(this.head, b.length, true);
      this.grow(8);
      this.head -= 8;
      this.view.setBigInt64(this.head, b.offset, true);
    }
    return this.writeI32(bufs.length);
  }

  /**
   * Inline Block vector (24-byte struct: {offset:i64, metaDataLength:i32, _pad:i32, bodyLength:i64}).
   */
  createBlockVector(
    blocks: ReadonlyArray<{ offset: bigint; metaDataLength: number; bodyLength: bigint }>,
  ): number {
    this.align(8);
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i]!;
      // write in reverse field order so layout is [offset][metaDataLength][pad][bodyLength]
      this.grow(8);
      this.head -= 8;
      this.view.setBigInt64(this.head, b.bodyLength, true);
      this.grow(4);
      this.head -= 4; // 4-byte padding
      this.grow(4);
      this.head -= 4;
      this.view.setInt32(this.head, b.metaDataLength, true);
      this.grow(8);
      this.head -= 8;
      this.view.setBigInt64(this.head, b.offset, true);
    }
    return this.writeI32(blocks.length);
  }

  // ── table builder ──────────────────────────────────────────────────────────

  /**
   * Build a FlatBuffer table.  `fields` maps field indices to typed values.
   * Fields are written from highest to lowest index (backward building ensures
   * lower-index fields end up at lower absolute positions in the output).
   */
  buildTable(
    fields: ReadonlyArray<
      | { kind: "absent"; index: number }
      | { kind: "bool"; index: number; value: boolean }
      | { kind: "u8"; index: number; value: number }
      | { kind: "i16"; index: number; value: number }
      | { kind: "i32"; index: number; value: number }
      | { kind: "i64"; index: number; value: bigint }
      | { kind: "offset"; index: number; target: number }
    >,
  ): number {
    const present = fields.filter((f) => f.kind !== "absent");
    const maxIndex = present.length === 0 ? -1 : Math.max(...present.map((f) => f.index));
    const numFields = maxIndex + 1;

    type FieldInfo = { index: number; abs: number; end: number };
    const fieldInfos: FieldInfo[] = [];

    for (let i = maxIndex; i >= 0; i--) {
      const field = present.find((f) => f.index === i);
      if (field === undefined) {
        continue;
      }
      let abs: number;
      let sz: number;
      switch (field.kind) {
        case "bool":
        case "u8": {
          abs = this.writeU8(field.kind === "bool" ? (field.value ? 1 : 0) : field.value);
          sz = 1;
          break;
        }
        case "i16": {
          abs = this.writeI16(field.value);
          sz = 2;
          break;
        }
        case "i32": {
          abs = this.writeI32(field.value);
          sz = 4;
          break;
        }
        case "i64": {
          abs = this.writeI64(field.value);
          sz = 8;
          break;
        }
        case "offset": {
          abs = this.writeUOffset(field.target);
          sz = 4;
          break;
        }
        default:
          continue;
      }
      fieldInfos.push({ index: i, abs, end: abs + sz });
    }

    // Reserve soffset_t (int32) — tableAbsIdx is the start of the table object
    this.align(4);
    this.grow(4);
    this.head -= 4;
    const tableAbsIdx = this.head;

    // Field offsets relative to tableAbsIdx (= tablePos in the output slice)
    const fieldOffsets: number[] = new Array(numFields).fill(0);
    for (const fi of fieldInfos) {
      fieldOffsets[fi.index] = fi.abs - tableAbsIdx;
    }

    const maxEnd = fieldInfos.reduce((m, f) => Math.max(m, f.end), tableAbsIdx + 4);
    const objectSize = maxEnd - tableAbsIdx;
    const vtableSize = (numFields + 2) * 2;

    // Write vtable (backward: field[numFields-1] … field[0], objectSize, vtableSize)
    for (let i = numFields - 1; i >= 0; i--) {
      this.writeU16(fieldOffsets[i] ?? 0);
    }
    this.writeU16(objectSize);
    this.writeU16(vtableSize);
    const vtableAbsIdx = this.head;

    // Patch soffset_t: vtable is before table, so delta is negative
    this.view.setInt32(tableAbsIdx, vtableAbsIdx - tableAbsIdx, true);
    return tableAbsIdx;
  }

  /** Finish building: write root uoffset_t and return the FlatBuffer slice. */
  finish(rootAbsIdx: number): Uint8Array {
    this.align(4);
    this.grow(4);
    this.head -= 4;
    this.view.setUint32(this.head, rootAbsIdx - this.head, true);
    return this.buf.slice(this.head);
  }
}

// ─── FlatBuffer reader ─────────────────────────────────────────────────────────

class FbTable {
  private readonly view: DataView;
  private readonly tablePos: number;
  private readonly vtablePos: number;
  private readonly vtableBytes: number;

  constructor(view: DataView, tablePos: number) {
    this.view = view;
    this.tablePos = tablePos;
    const soffset = view.getInt32(tablePos, true);
    this.vtablePos = tablePos + soffset;
    this.vtableBytes = view.getUint16(this.vtablePos, true);
  }

  private fieldOff(idx: number): number {
    const vOff = 4 + idx * 2;
    if (vOff + 2 > this.vtableBytes) {
      return 0;
    }
    return this.view.getUint16(this.vtablePos + vOff, true);
  }

  readBool(idx: number): boolean | undefined {
    const off = this.fieldOff(idx);
    return off === 0 ? undefined : this.view.getUint8(this.tablePos + off) !== 0;
  }

  readU8(idx: number): number | undefined {
    const off = this.fieldOff(idx);
    return off === 0 ? undefined : this.view.getUint8(this.tablePos + off);
  }

  readI16(idx: number): number | undefined {
    const off = this.fieldOff(idx);
    return off === 0 ? undefined : this.view.getInt16(this.tablePos + off, true);
  }

  readI32(idx: number): number | undefined {
    const off = this.fieldOff(idx);
    return off === 0 ? undefined : this.view.getInt32(this.tablePos + off, true);
  }

  readI64(idx: number): bigint | undefined {
    const off = this.fieldOff(idx);
    return off === 0 ? undefined : this.view.getBigInt64(this.tablePos + off, true);
  }

  readString(idx: number): string | undefined {
    const off = this.fieldOff(idx);
    if (off === 0) {
      return undefined;
    }
    const fieldPos = this.tablePos + off;
    const uoff = this.view.getUint32(fieldPos, true);
    const strPos = fieldPos + uoff;
    const len = this.view.getUint32(strPos, true);
    return new TextDecoder().decode(
      new Uint8Array(this.view.buffer, this.view.byteOffset + strPos + 4, len),
    );
  }

  readSubTable(idx: number): FbTable | undefined {
    const off = this.fieldOff(idx);
    if (off === 0) {
      return undefined;
    }
    const fieldPos = this.tablePos + off;
    return new FbTable(this.view, fieldPos + this.view.getUint32(fieldPos, true));
  }

  readVectorCount(idx: number): number {
    const off = this.fieldOff(idx);
    if (off === 0) {
      return 0;
    }
    const fieldPos = this.tablePos + off;
    return this.view.getUint32(fieldPos + this.view.getUint32(fieldPos, true), true);
  }

  readVectorTable(idx: number, i: number): FbTable | undefined {
    const off = this.fieldOff(idx);
    if (off === 0) {
      return undefined;
    }
    const fieldPos = this.tablePos + off;
    const vecPos = fieldPos + this.view.getUint32(fieldPos, true);
    if (i >= this.view.getUint32(vecPos, true)) {
      return undefined;
    }
    const elemPos = vecPos + 4 + i * 4;
    return new FbTable(this.view, elemPos + this.view.getUint32(elemPos, true));
  }

  readVectorString(idx: number, i: number): string | undefined {
    const off = this.fieldOff(idx);
    if (off === 0) {
      return undefined;
    }
    const fieldPos = this.tablePos + off;
    const vecPos = fieldPos + this.view.getUint32(fieldPos, true);
    if (i >= this.view.getUint32(vecPos, true)) {
      return undefined;
    }
    const elemPos = vecPos + 4 + i * 4;
    const strPos = elemPos + this.view.getUint32(elemPos, true);
    const len = this.view.getUint32(strPos, true);
    return new TextDecoder().decode(
      new Uint8Array(this.view.buffer, this.view.byteOffset + strPos + 4, len),
    );
  }

  /**
   * Read one element from an inline 16-byte struct vector
   * ({field_a: i64, field_b: i64}).  Used for FieldNode and Buffer.
   */
  readStruct16(vecIdx: number, i: number): { a: bigint; b: bigint } | undefined {
    const off = this.fieldOff(vecIdx);
    if (off === 0) {
      return undefined;
    }
    const fieldPos = this.tablePos + off;
    const vecPos = fieldPos + this.view.getUint32(fieldPos, true);
    if (i >= this.view.getUint32(vecPos, true)) {
      return undefined;
    }
    const elemPos = vecPos + 4 + i * 16;
    return {
      a: this.view.getBigInt64(elemPos, true),
      b: this.view.getBigInt64(elemPos + 8, true),
    };
  }

  /**
   * Read one Block struct (24 bytes: {offset:i64, metaDataLength:i32, _pad:i32, bodyLength:i64}).
   */
  readBlock(
    vecIdx: number,
    i: number,
  ): { offset: bigint; metaDataLength: number; bodyLength: bigint } | undefined {
    const off = this.fieldOff(vecIdx);
    if (off === 0) {
      return undefined;
    }
    const fieldPos = this.tablePos + off;
    const vecPos = fieldPos + this.view.getUint32(fieldPos, true);
    if (i >= this.view.getUint32(vecPos, true)) {
      return undefined;
    }
    const ep = vecPos + 4 + i * 24;
    return {
      offset: this.view.getBigInt64(ep, true),
      metaDataLength: this.view.getInt32(ep + 8, true),
      bodyLength: this.view.getBigInt64(ep + 16, true),
    };
  }
}

function fbRoot(buf: Uint8Array): FbTable {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return new FbTable(view, view.getUint32(0, true));
}

// ─── Arrow schema builders ─────────────────────────────────────────────────────

function buildSchema(b: FbBuilder, cols: ReadonlyArray<{ name: string; type: ColType }>): number {
  const fieldAbsIdxs = cols.map(({ name, type }) => {
    const nameAbs = b.createString(name);
    let typeCode: number;
    let typeAbs: number;
    switch (type.kind) {
      case "int": {
        typeCode = TYPE_INT;
        typeAbs = b.buildTable([
          { kind: "i32", index: 0, value: type.bitWidth },
          { kind: "bool", index: 1, value: type.isSigned },
        ]);
        break;
      }
      case "float": {
        typeCode = TYPE_FLOAT;
        typeAbs = b.buildTable([{ kind: "i16", index: 0, value: type.precision }]);
        break;
      }
      case "bool": {
        typeCode = TYPE_BOOL;
        typeAbs = b.buildTable([]);
        break;
      }
      case "utf8": {
        typeCode = TYPE_UTF8;
        typeAbs = b.buildTable([]);
        break;
      }
    }
    // Field: 0=name, 1=nullable, 2=type_type, 3=type
    return b.buildTable([
      { kind: "offset", index: 0, target: nameAbs },
      { kind: "bool", index: 1, value: true },
      { kind: "u8", index: 2, value: typeCode },
      { kind: "offset", index: 3, target: typeAbs },
    ]);
  });
  const fieldsVec = b.createOffsetVector(fieldAbsIdxs);
  return b.buildTable([
    { kind: "i16", index: 0, value: ENDIAN_LITTLE },
    { kind: "offset", index: 1, target: fieldsVec },
  ]);
}

function buildSchemaMessage(cols: ReadonlyArray<{ name: string; type: ColType }>): Uint8Array {
  const b = new FbBuilder();
  const schemaAbs = buildSchema(b, cols);
  const msgAbs = b.buildTable([
    { kind: "i16", index: 0, value: META_V5 },
    { kind: "u8", index: 1, value: MSG_SCHEMA },
    { kind: "offset", index: 2, target: schemaAbs },
    { kind: "i64", index: 3, value: 0n },
  ]);
  return b.finish(msgAbs);
}

function buildRecordBatchMessage(
  numRows: number,
  nodes: ReadonlyArray<{ length: bigint; nullCount: bigint }>,
  buffers: ReadonlyArray<{ offset: bigint; length: bigint }>,
  bodyLength: bigint,
): Uint8Array {
  const b = new FbBuilder();
  const nodesVec = b.createFieldNodeVector(nodes);
  const bufsVec = b.createBufferVector(buffers);
  const rbAbs = b.buildTable([
    { kind: "i64", index: 0, value: BigInt(numRows) },
    { kind: "offset", index: 1, target: nodesVec },
    { kind: "offset", index: 2, target: bufsVec },
  ]);
  const msgAbs = b.buildTable([
    { kind: "i16", index: 0, value: META_V5 },
    { kind: "u8", index: 1, value: MSG_RECORD_BATCH },
    { kind: "offset", index: 2, target: rbAbs },
    { kind: "i64", index: 3, value: bodyLength },
  ]);
  return b.finish(msgAbs);
}

function buildFooter(
  cols: ReadonlyArray<{ name: string; type: ColType }>,
  blocks: ReadonlyArray<{ offset: bigint; metaDataLength: number; bodyLength: bigint }>,
): Uint8Array {
  const b = new FbBuilder();
  const schemaAbs = buildSchema(b, cols);
  const dictsVec = b.createOffsetVector([]);
  const blocksVec = b.createBlockVector(blocks);
  const footerAbs = b.buildTable([
    { kind: "i16", index: 0, value: META_V5 },
    { kind: "offset", index: 1, target: schemaAbs },
    { kind: "offset", index: 2, target: dictsVec },
    { kind: "offset", index: 3, target: blocksVec },
  ]);
  return b.finish(footerAbs);
}

// ─── Column encoding helpers ───────────────────────────────────────────────────

function padTo8(n: number): number {
  return (n + 7) & ~7;
}

/** Returns a bitpacked validity bitmap, or `null` if all values are non-null. */
function encodeValidity(values: readonly (Scalar | null)[]): Uint8Array | null {
  let anyNull = false;
  for (const v of values) {
    if (v === null || v === undefined) {
      anyNull = true;
      break;
    }
  }
  if (!anyNull) {
    return null;
  }
  const bitmap = new Uint8Array(Math.ceil(values.length / 8));
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null && values[i] !== undefined) {
      bitmap[Math.floor(i / 8)]! |= 1 << (i % 8);
    }
  }
  return bitmap;
}

/** Count nulls in a value array. */
function countNulls(values: readonly (Scalar | null)[]): number {
  let n = 0;
  for (const v of values) {
    if (v === null || v === undefined) {
      n++;
    }
  }
  return n;
}

function encodeInt64s(values: readonly (Scalar | null)[]): Uint8Array {
  const buf = new Uint8Array(values.length * 8);
  const dv = new DataView(buf.buffer);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const n =
      v === null || v === undefined
        ? 0n
        : typeof v === "bigint"
          ? v
          : BigInt(Math.trunc(Number(v)));
    dv.setBigInt64(i * 8, n, true);
  }
  return buf;
}

function encodeFloat64s(values: readonly (Scalar | null)[]): Uint8Array {
  const buf = new Uint8Array(values.length * 8);
  const dv = new DataView(buf.buffer);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    dv.setFloat64(i * 8, v === null || v === undefined ? Number.NaN : Number(v), true);
  }
  return buf;
}

function encodeFloat32s(values: readonly (Scalar | null)[]): Uint8Array {
  const buf = new Uint8Array(values.length * 4);
  const dv = new DataView(buf.buffer);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    dv.setFloat32(i * 4, v === null || v === undefined ? Number.NaN : Number(v), true);
  }
  return buf;
}

function encodeBools(values: readonly (Scalar | null)[]): Uint8Array {
  const buf = new Uint8Array(Math.ceil(values.length / 8));
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== null && v !== undefined && Boolean(v)) {
      buf[Math.floor(i / 8)]! |= 1 << (i % 8);
    }
  }
  return buf;
}

function encodeStrings(values: readonly (Scalar | null)[]): {
  offsets: Uint8Array;
  data: Uint8Array;
} {
  const enc = new TextEncoder();
  const encoded: Uint8Array[] = [];
  let totalBytes = 0;
  for (const v of values) {
    if (v !== null && v !== undefined) {
      const b = enc.encode(String(v));
      encoded.push(b);
      totalBytes += b.length;
    } else {
      encoded.push(new Uint8Array(0));
    }
  }
  const offsets = new Uint8Array((values.length + 1) * 4);
  const ov = new DataView(offsets.buffer);
  const data = new Uint8Array(totalBytes);
  let pos = 0;
  for (let i = 0; i < encoded.length; i++) {
    ov.setInt32(i * 4, pos, true);
    data.set(encoded[i]!, pos);
    pos += encoded[i]!.length;
  }
  ov.setInt32(values.length * 4, pos, true);
  return { offsets, data };
}

// ─── Column decoding helpers ───────────────────────────────────────────────────

function decodeValidity(bitmap: Uint8Array, count: number): boolean[] {
  const valid = new Array<boolean>(count);
  for (let i = 0; i < count; i++) {
    valid[i] = ((bitmap[Math.floor(i / 8)]! >> (i % 8)) & 1) === 1;
  }
  return valid;
}

function decodeInt(
  body: Uint8Array,
  bodyOff: number,
  count: number,
  bitWidth: number,
  isSigned: boolean,
): Scalar[] {
  const dv = new DataView(body.buffer, body.byteOffset + bodyOff);
  const out: Scalar[] = new Array(count);
  for (let i = 0; i < count; i++) {
    switch (bitWidth) {
      case 8:
        out[i] = isSigned ? dv.getInt8(i) : dv.getUint8(i);
        break;
      case 16:
        out[i] = isSigned ? dv.getInt16(i * 2, true) : dv.getUint16(i * 2, true);
        break;
      case 32:
        out[i] = isSigned ? dv.getInt32(i * 4, true) : dv.getUint32(i * 4, true);
        break;
      case 64: {
        const v = isSigned ? dv.getBigInt64(i * 8, true) : dv.getBigUint64(i * 8, true);
        out[i] = Number(v);
        break;
      }
      default:
        out[i] = 0;
    }
  }
  return out;
}

function decodeFloat(
  body: Uint8Array,
  bodyOff: number,
  count: number,
  precision: number,
): Scalar[] {
  const dv = new DataView(body.buffer, body.byteOffset + bodyOff);
  const out: Scalar[] = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = precision === PREC_SINGLE ? dv.getFloat32(i * 4, true) : dv.getFloat64(i * 8, true);
  }
  return out;
}

function decodeBool(body: Uint8Array, bodyOff: number, count: number): Scalar[] {
  const out: Scalar[] = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = ((body[bodyOff + Math.floor(i / 8)]! >> (i % 8)) & 1) === 1;
  }
  return out;
}

function decodeUtf8(
  body: Uint8Array,
  offsBodyOff: number,
  dataBodyOff: number,
  count: number,
): Scalar[] {
  const ov = new DataView(body.buffer, body.byteOffset + offsBodyOff);
  const dec = new TextDecoder();
  const out: Scalar[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const start = ov.getInt32(i * 4, true);
    const end = ov.getInt32((i + 1) * 4, true);
    out[i] = dec.decode(body.subarray(dataBodyOff + start, dataBodyOff + end));
  }
  return out;
}

// ─── IPC message framing ──────────────────────────────────────────────────────

/**
 * Emit an Arrow IPC message frame into `out` (byte-array accumulator).
 * Returns the byte offset within `out` at which this message starts.
 */
function appendMessage(out: number[], metadata: Uint8Array, body: Uint8Array | null): number {
  const startPos = out.length;
  const paddedMetaLen = padTo8(metadata.length);

  // Continuation marker + padded metadata size
  const hdr = new Uint8Array(8);
  const hdrDv = new DataView(hdr.buffer);
  hdrDv.setInt32(0, CONTINUATION_I32, true);
  hdrDv.setInt32(4, paddedMetaLen, true);
  for (const b of hdr) {
    out.push(b);
  }

  // FlatBuffer bytes + zero padding
  for (const b of metadata) {
    out.push(b);
  }
  for (let i = metadata.length; i < paddedMetaLen; i++) {
    out.push(0);
  }

  // Optional body (already padded by caller)
  if (body) {
    for (const b of body) {
      out.push(b);
    }
  }

  return startPos;
}

// ─── toFeather ─────────────────────────────────────────────────────────────────

/**
 * Serialize a DataFrame to an Apache Arrow IPC (Feather v2) binary buffer.
 * Mirrors `pandas.DataFrame.to_feather()`.
 */
export function toFeather(df: DataFrame, options: ToFeatherOptions = {}): Uint8Array {
  const { writeIndex = false } = options;

  type ColData = { name: string; type: ColType; values: readonly (Scalar | null)[] };
  const cols: ColData[] = [];

  if (writeIndex) {
    const idxVals = [...df.index.values] as (Scalar | null)[];
    cols.push({
      name: "__index_level_0__",
      type: { kind: "utf8" },
      values: idxVals.map((v) => (v === null ? null : String(v))),
    });
  }

  for (const name of df.columns.values as string[]) {
    const s = df.col(name);
    const values = s.values as readonly (Scalar | null)[];
    const dtype = s.dtype;
    let type: ColType;
    if (dtype.kind === "float") {
      type = { kind: "float", precision: dtype.itemsize === 4 ? PREC_SINGLE : PREC_DOUBLE };
    } else if (dtype.kind === "bool") {
      type = { kind: "bool" };
    } else if (dtype.kind === "string") {
      type = { kind: "utf8" };
    } else if (dtype.kind === "int" || dtype.kind === "uint") {
      type = { kind: "int", bitWidth: dtype.itemsize * 8, isSigned: dtype.kind === "int" };
    } else {
      // Unknown dtype: sniff from values
      let isFloat = false;
      let hasBool = false;
      let hasStr = false;
      for (const v of values) {
        if (v === null || v === undefined) {
          continue;
        }
        if (typeof v === "boolean") {
          hasBool = true;
          break;
        }
        if (typeof v === "string") {
          hasStr = true;
          break;
        }
        if (typeof v === "number" && !Number.isInteger(v)) {
          isFloat = true;
        }
      }
      if (hasStr) {
        type = { kind: "utf8" };
      } else if (hasBool) {
        type = { kind: "bool" };
      } else if (isFloat) {
        type = { kind: "float", precision: PREC_DOUBLE };
      } else {
        type = { kind: "int", bitWidth: 64, isSigned: true };
      }
    }
    cols.push({ name, type, values });
  }

  const numRows = cols.length > 0 ? cols[0]!.values.length : df.index.size;
  const schemaCols = cols.map((c) => ({ name: c.name, type: c.type }));

  // Encode all column buffers into a single body array
  const bodyParts: Uint8Array[] = [];
  const nodes: { length: bigint; nullCount: bigint }[] = [];
  const bufferInfos: { offset: bigint; length: bigint }[] = [];
  let bodyOffset = 0n;

  function pushBodyBuf(buf: Uint8Array) {
    bufferInfos.push({ offset: bodyOffset, length: BigInt(buf.length) });
    bodyParts.push(buf);
    const padded = padTo8(buf.length);
    if (padded > buf.length) {
      bodyParts.push(new Uint8Array(padded - buf.length));
    }
    bodyOffset += BigInt(padded);
  }

  for (const col of cols) {
    const { type, values } = col;
    const validity = encodeValidity(values);
    const nullCount = validity ? countNulls(values) : 0;
    nodes.push({ length: BigInt(values.length), nullCount: BigInt(nullCount) });

    // Validity buffer (empty = no nulls)
    pushBodyBuf(validity ?? new Uint8Array(0));

    // Data buffer(s)
    switch (type.kind) {
      case "int":
        pushBodyBuf(encodeInt64s(values));
        break;
      case "float":
        pushBodyBuf(
          type.precision === PREC_SINGLE ? encodeFloat32s(values) : encodeFloat64s(values),
        );
        break;
      case "bool":
        pushBodyBuf(encodeBools(values));
        break;
      case "utf8": {
        const { offsets, data } = encodeStrings(values);
        pushBodyBuf(offsets);
        pushBodyBuf(data);
        break;
      }
    }
  }

  // Assemble body
  let totalBodyLen = 0;
  for (const p of bodyParts) {
    totalBodyLen += p.length;
  }
  const body = new Uint8Array(totalBodyLen);
  let bpos = 0;
  for (const p of bodyParts) {
    body.set(p, bpos);
    bpos += p.length;
  }

  // Build messages and file
  const out: number[] = [];
  for (const b of MAGIC) {
    out.push(b);
  }

  // Schema message (no body)
  appendMessage(out, buildSchemaMessage(schemaCols), null);

  // RecordBatch message
  const rbMeta = buildRecordBatchMessage(numRows, nodes, bufferInfos, bodyOffset);
  const rbStart = out.length;
  appendMessage(out, rbMeta, body);

  const rbPaddedMeta = padTo8(rbMeta.length);
  const rbMetaLen = 8 + rbPaddedMeta; // 4-byte continuation + 4-byte size + padded FlatBuffer

  // Footer
  const blocks = [{ offset: BigInt(rbStart), metaDataLength: rbMetaLen, bodyLength: bodyOffset }];
  const footer = buildFooter(schemaCols, blocks);
  for (const b of footer) {
    out.push(b);
  }

  // Footer size (int32 LE) + trailing magic
  const fsizeBuf = new Uint8Array(4);
  new DataView(fsizeBuf.buffer).setInt32(0, footer.length, true);
  for (const b of fsizeBuf) {
    out.push(b);
  }
  for (const b of MAGIC) {
    out.push(b);
  }

  return new Uint8Array(out);
}

// ─── readFeather ──────────────────────────────────────────────────────────────

/**
 * Parse an Apache Arrow IPC (Feather v2) binary buffer into a DataFrame.
 * Mirrors `pandas.read_feather()`.
 */
export function readFeather(data: Uint8Array, options: ReadFeatherOptions = {}): DataFrame {
  const { indexCol = null, usecols = null } = options;

  // Verify opening magic
  if (new TextDecoder().decode(data.subarray(0, 6)) !== "ARROW1") {
    throw new Error("readFeather: not an Arrow IPC file (bad magic bytes at start)");
  }
  if (new TextDecoder().decode(data.subarray(data.length - 8, data.length - 2)) !== "ARROW1") {
    throw new Error("readFeather: not an Arrow IPC file (bad magic bytes at end)");
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Parse footer
  const footerSize = view.getInt32(data.length - 12, true);
  const footerStart = data.length - 12 - footerSize;
  const footerFb = fbRoot(data.subarray(footerStart, footerStart + footerSize));

  // Parse schema from footer
  const schemaFb = footerFb.readSubTable(1);
  if (!schemaFb) {
    throw new Error("readFeather: missing schema in footer");
  }

  const numFields = schemaFb.readVectorCount(1);
  type ParsedField = { name: string; typeCode: number; sub: FbTable | undefined };
  const parsedFields: ParsedField[] = [];
  for (let i = 0; i < numFields; i++) {
    const ft = schemaFb.readVectorTable(1, i);
    if (!ft) {
      continue;
    }
    parsedFields.push({
      name: ft.readString(0) ?? `col_${i}`,
      typeCode: ft.readU8(2) ?? 0,
      sub: ft.readSubTable(3),
    });
  }

  // Count record batch blocks
  let blockCount = 0;
  while (footerFb.readBlock(3, blockCount) !== undefined) {
    blockCount++;
  }

  if (blockCount === 0) {
    // Empty file
    const empty: Record<string, readonly Scalar[]> = {};
    for (const f of parsedFields) {
      if (usecols !== null && !usecols.includes(f.name)) {
        continue;
      }
      empty[f.name] = [];
    }
    return DataFrame.fromColumns(empty);
  }

  // Use the first record batch block
  const block = footerFb.readBlock(3, 0)!;
  const blockOffset = Number(block.offset);

  // Parse RecordBatch message
  if (view.getInt32(blockOffset, true) !== CONTINUATION_I32) {
    throw new Error("readFeather: invalid continuation marker");
  }
  const paddedMetaLen = view.getInt32(blockOffset + 4, true);
  const metaBuf = data.subarray(blockOffset + 8, blockOffset + 8 + paddedMetaLen);
  const msgFb = fbRoot(metaBuf);

  if (msgFb.readU8(1) !== MSG_RECORD_BATCH) {
    throw new Error("readFeather: expected RecordBatch message");
  }
  const rbFb = msgFb.readSubTable(2);
  if (!rbFb) {
    throw new Error("readFeather: missing RecordBatch in message");
  }

  const numRows = Number(rbFb.readI64(0) ?? 0n);
  const bodyStart = blockOffset + 8 + paddedMetaLen;
  const body = data.subarray(bodyStart, bodyStart + Number(block.bodyLength));

  // Decode each column
  const resultData: Record<string, Scalar[]> = {};
  let bufIdx = 0;
  let _nodeIdx = 0;

  for (const field of parsedFields) {
    const numBufs = field.typeCode === TYPE_UTF8 || field.typeCode === TYPE_LARGE_UTF8 ? 3 : 2;

    if (usecols !== null && !usecols.includes(field.name)) {
      bufIdx += numBufs;
      _nodeIdx++;
      continue;
    }

    _nodeIdx++;

    // Validity buffer
    const validBufInfo = rbFb.readStruct16(2, bufIdx);
    bufIdx++;
    let validMask: boolean[] | null = null;
    if (validBufInfo !== undefined && Number(validBufInfo.b) > 0) {
      const vOff = Number(validBufInfo.a);
      const vLen = Number(validBufInfo.b);
      validMask = decodeValidity(body.subarray(vOff, vOff + vLen), numRows);
    }

    let values: Scalar[];

    switch (field.typeCode) {
      case TYPE_INT: {
        const bitWidth = field.sub?.readI32(0) ?? 64;
        const isSigned = field.sub?.readBool(1) ?? true;
        const dBuf = rbFb.readStruct16(2, bufIdx)!;
        bufIdx++;
        values = decodeInt(body, Number(dBuf.a), numRows, bitWidth, isSigned);
        break;
      }
      case TYPE_FLOAT: {
        const precision = field.sub?.readI16(0) ?? PREC_DOUBLE;
        const dBuf = rbFb.readStruct16(2, bufIdx)!;
        bufIdx++;
        values = decodeFloat(body, Number(dBuf.a), numRows, precision);
        break;
      }
      case TYPE_BOOL: {
        const dBuf = rbFb.readStruct16(2, bufIdx)!;
        bufIdx++;
        values = decodeBool(body, Number(dBuf.a), numRows);
        break;
      }
      case TYPE_UTF8:
      case TYPE_LARGE_UTF8: {
        const oBuf = rbFb.readStruct16(2, bufIdx)!;
        bufIdx++;
        const dBuf = rbFb.readStruct16(2, bufIdx)!;
        bufIdx++;
        values = decodeUtf8(body, Number(oBuf.a), Number(dBuf.a), numRows);
        break;
      }
      default: {
        bufIdx++;
        values = new Array<Scalar>(numRows).fill(null);
      }
    }

    // Apply validity mask (null = 0 bit in validity bitmap)
    if (validMask !== null) {
      for (let i = 0; i < numRows; i++) {
        if (!validMask[i]) {
          values[i] = null;
        }
      }
    }

    resultData[field.name] = values;
  }

  // Extract index column if requested
  let index: Index<Label> | undefined;
  if (indexCol !== null && indexCol in resultData) {
    const idxVals = resultData[indexCol]!;
    index = new Index<Label>(idxVals as Label[]);
    delete resultData[indexCol];
  }

  const cols: Record<string, readonly Scalar[]> = {};
  for (const [k, v] of Object.entries(resultData)) {
    cols[k] = v;
  }

  return DataFrame.fromColumns(cols, index !== undefined ? { index } : undefined);
}
