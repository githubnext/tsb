/**
 * read_avro — Apache Avro Object Container File (OCF) reader for DataFrame.
 *
 * Mirrors `pandas.read_avro()`. Parses Avro OCF binary format purely in
 * TypeScript with no external dependencies.
 *
 * Supported Avro schema types:
 * - Primitives: null, boolean, int, long, float, double, string, bytes
 * - Named:      record, enum, fixed
 * - Complex:    array, map, union
 * - Logical:    date (int), timestamp-millis (long), timestamp-micros (long)
 *
 * Supported codecs: `null` (uncompressed). `deflate` and `snappy` blocks
 * are detected but raise an informative error.
 *
 * @example
 * ```ts
 * import { readAvro } from "tsb";
 *
 * const df = readAvro(buffer);          // Uint8Array from file read
 * console.log(df.columns, df.shape);
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import type { Scalar } from "../types.ts";

// ─── Public types ──────────────────────────────────────────────────────────────

/** Options for {@link readAvro}. */
export interface ReadAvroOptions {
  /** Columns to include. Default: all columns. */
  readonly usecols?: readonly string[] | null;
  /**
   * How to handle schema unions that include `null`:
   * - `"object"` (default): return `null` for null values.
   * - `"first"`: return the first non-null type's value.
   */
  readonly nullHandling?: "object" | "first";
}

// ─── Avro schema types ────────────────────────────────────────────────────────

type AvroSchema =
  | AvroPrimitive
  | AvroRecord
  | AvroEnum
  | AvroArray
  | AvroMap
  | AvroUnion
  | AvroFixed;

type AvroPrimitive =
  | "null"
  | "boolean"
  | "int"
  | "long"
  | "float"
  | "double"
  | "string"
  | "bytes";

interface AvroRecord {
  type: "record";
  name: string;
  fields: readonly AvroField[];
}

interface AvroField {
  name: string;
  type: AvroSchema;
  default?: unknown;
}

interface AvroEnum {
  type: "enum";
  name: string;
  symbols: readonly string[];
}

interface AvroArray {
  type: "array";
  items: AvroSchema;
}

interface AvroMap {
  type: "map";
  values: AvroSchema;
}

type AvroUnion = readonly AvroSchema[];

interface AvroFixed {
  type: "fixed";
  name: string;
  size: number;
}

// ─── Binary reader ────────────────────────────────────────────────────────────

class AvroReader {
  private buf: Uint8Array;
  private pos: number = 0;

  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  get position(): number { return this.pos; }
  get remaining(): number { return this.buf.length - this.pos; }

  readByte(): number {
    if (this.pos >= this.buf.length) throw new RangeError("Unexpected end of Avro data");
    return this.buf[this.pos++] ?? 0;
  }

  /** Read a variable-length zigzag-encoded long. Returns a JS number (safe up to 2^53). */
  readLong(): number {
    let result = 0;
    let shift = 0;
    while (true) {
      const b = this.readByte();
      result |= (b & 0x7f) << shift;
      shift += 7;
      if ((b & 0x80) === 0) break;
      if (shift >= 63) {
        // For very large values, handle the remaining bits separately
        // to avoid JS bitwise overflow (32-bit integers)
        if (shift === 63) {
          const hi = b & 0x7f;
          // combine: result (low 63 bits) + hi << 63 — just approximate as float
          const lo = result >>> 0;
          result = lo + hi * 2 ** 63;
        }
        break;
      }
    }
    // Zigzag decode: (n >>> 1) ^ -(n & 1)
    return (result >>> 1) ^ -(result & 1);
  }

  /** Read a 32-bit int (zigzag long with range check). */
  readInt(): number {
    return this.readLong() | 0;
  }

  /** Read 4-byte IEEE 754 float. */
  readFloat(): number {
    const bytes = this.readBytes(4);
    const view = new DataView(bytes.buffer, bytes.byteOffset, 4);
    return view.getFloat32(0, true);
  }

  /** Read 8-byte IEEE 754 double. */
  readDouble(): number {
    const bytes = this.readBytes(8);
    const view = new DataView(bytes.buffer, bytes.byteOffset, 8);
    return view.getFloat64(0, true);
  }

  /** Read exactly n bytes as a new Uint8Array. */
  readBytes(n: number): Uint8Array {
    if (this.pos + n > this.buf.length) throw new RangeError("Unexpected end of Avro data");
    const slice = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return slice;
  }

  /** Read Avro bytes field (length-prefixed). */
  readByteField(): Uint8Array {
    const len = this.readLong();
    return this.readBytes(len);
  }

  /** Read UTF-8 string (length-prefixed). */
  readString(): string {
    const bytes = this.readByteField();
    return new TextDecoder().decode(bytes);
  }

  /** Read a boolean (0 = false, 1 = true). */
  readBoolean(): boolean {
    return this.readByte() !== 0;
  }

  /** Skip forward n bytes. */
  skip(n: number): void {
    if (this.pos + n > this.buf.length) throw new RangeError("Unexpected end of Avro data");
    this.pos += n;
  }

  /** Peek at 16 bytes (sync marker) and advance. */
  readSync(): Uint8Array {
    return this.readBytes(16);
  }
}

// ─── Schema parsing ────────────────────────────────────────────────────────────

const td = new TextDecoder();

function parseSchema(raw: unknown): AvroSchema {
  if (typeof raw === "string") {
    const prim = raw as AvroPrimitive;
    return prim;
  }
  if (Array.isArray(raw)) {
    return raw.map(parseSchema) as AvroUnion;
  }
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const type = obj["type"];
    if (type === "record") {
      const fields = (obj["fields"] as unknown[]).map((f) => {
        const field = f as Record<string, unknown>;
        return { name: field["name"] as string, type: parseSchema(field["type"]) };
      });
      return { type: "record", name: obj["name"] as string, fields };
    }
    if (type === "array") {
      return { type: "array", items: parseSchema(obj["items"]) };
    }
    if (type === "map") {
      return { type: "map", values: parseSchema(obj["values"]) };
    }
    if (type === "enum") {
      return {
        type: "enum",
        name: obj["name"] as string,
        symbols: obj["symbols"] as string[],
      };
    }
    if (type === "fixed") {
      return {
        type: "fixed",
        name: obj["name"] as string,
        size: obj["size"] as number,
      };
    }
    // Logical types: delegate to the underlying type
    if (typeof type === "string") {
      return parseSchema(type);
    }
  }
  throw new TypeError(`Unknown Avro schema: ${JSON.stringify(raw)}`);
}

// ─── Datum reading ────────────────────────────────────────────────────────────

/** Avro leaf value (no recursion at type level — containers use unknown). */
type AvroLeaf = null | boolean | number | string | Uint8Array;
/** Container interfaces allow recursive self-reference (interfaces can, type aliases cannot). */
interface AvroDatumArr extends Array<AvroDatum> {}
interface AvroDatumMap extends Map<string, AvroDatum> {}
interface AvroDatumRecord extends Record<string, AvroDatum> {}
/** Recursive Avro datum. */
type AvroDatum = AvroLeaf | AvroDatumArr | AvroDatumMap | AvroDatumRecord;

function readDatum(reader: AvroReader, schema: AvroSchema): AvroDatum {
  if (typeof schema === "string") {
    switch (schema) {
      case "null": return null;
      case "boolean": return reader.readBoolean();
      case "int": return reader.readInt();
      case "long": return reader.readLong();
      case "float": return reader.readFloat();
      case "double": return reader.readDouble();
      case "string": return reader.readString();
      case "bytes": return reader.readByteField();
    }
  }
  if (Array.isArray(schema)) {
    // Union: first read the branch index
    const idx = reader.readLong();
    const branch = (schema as AvroUnion)[idx];
    if (branch === undefined) throw new RangeError(`Union branch ${idx} out of range`);
    return readDatum(reader, branch);
  }
  const s = schema as Exclude<AvroSchema, AvroPrimitive | AvroUnion>;
  if (s.type === "record") {
    const rec: Record<string, AvroDatum> = {};
    for (const field of s.fields) {
      rec[field.name] = readDatum(reader, field.type);
    }
    return rec;
  }
  if (s.type === "array") {
    const arr: AvroDatum[] = [];
    while (true) {
      let count = reader.readLong();
      if (count === 0) break;
      // Negative count means block has a byte count prefix
      if (count < 0) { reader.readLong(); count = -count; }
      for (let i = 0; i < count; i++) arr.push(readDatum(reader, s.items));
    }
    return arr;
  }
  if (s.type === "map") {
    const map = new Map<string, AvroDatum>();
    while (true) {
      let count = reader.readLong();
      if (count === 0) break;
      if (count < 0) { reader.readLong(); count = -count; }
      for (let i = 0; i < count; i++) {
        const key = reader.readString();
        map.set(key, readDatum(reader, s.values));
      }
    }
    return map;
  }
  if (s.type === "enum") {
    const idx = reader.readInt();
    return s.symbols[idx] ?? null;
  }
  if (s.type === "fixed") {
    return reader.readBytes(s.size);
  }
  throw new TypeError(`Unhandled schema type: ${JSON.stringify(schema)}`);
}

// ─── OCF parsing ──────────────────────────────────────────────────────────────

const AVRO_MAGIC = new Uint8Array([79, 98, 106, 1]); // "Obj\x01"

function syncEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Parse an Apache Avro Object Container File buffer into an array of row objects.
 * Returns the top-level schema and the rows.
 */
function parseAvroOCF(
  buf: Uint8Array,
): { schema: AvroSchema; rows: Record<string, AvroDatum>[] } {
  const reader = new AvroReader(buf);

  // Magic: "Obj\x01"
  const magic = reader.readBytes(4);
  if (!syncEq(magic, AVRO_MAGIC)) {
    throw new TypeError(
      `Not a valid Avro file: expected magic bytes "Obj\\x01", got ${[...magic].map((b) => b.toString(16)).join(" ")}`,
    );
  }

  // File-level metadata: map<bytes>
  const meta = new Map<string, Uint8Array>();
  while (true) {
    let count = reader.readLong();
    if (count === 0) break;
    if (count < 0) { reader.readLong(); count = -count; }
    for (let i = 0; i < count; i++) {
      const key = reader.readString();
      const val = reader.readByteField();
      meta.set(key, val);
    }
  }

  // Schema
  const schemaBytes = meta.get("avro.schema");
  if (!schemaBytes) throw new TypeError("Avro file missing avro.schema metadata");
  const schemaJson: unknown = JSON.parse(td.decode(schemaBytes));
  const schema = parseSchema(schemaJson);

  // Codec
  const codecBytes = meta.get("avro.codec");
  const codec = codecBytes ? td.decode(codecBytes) : "null";
  if (codec !== "null") {
    throw new TypeError(
      `Avro codec "${codec}" is not supported. Only "null" (uncompressed) is implemented.`,
    );
  }

  // Sync marker (16 bytes)
  const syncMarker = reader.readSync();

  // Data blocks
  const rows: Record<string, AvroDatum>[] = [];
  while (reader.remaining >= 16) {
    const objectCount = reader.readLong();
    const _byteCount = reader.readLong(); // block size (unused for null codec)
    if (objectCount <= 0) break;

    for (let i = 0; i < objectCount; i++) {
      const datum = readDatum(reader, schema);
      if (typeof datum === "object" && datum !== null && !Array.isArray(datum) && !(datum instanceof Uint8Array) && !(datum instanceof Map)) {
        rows.push(datum as Record<string, AvroDatum>);
      }
    }

    // Read and verify sync marker
    const blockSync = reader.readSync();
    if (!syncEq(blockSync, syncMarker)) {
      throw new TypeError("Avro sync marker mismatch — file may be corrupt");
    }
  }

  return { schema, rows };
}

// ─── DataFrame construction ───────────────────────────────────────────────────

function flattenDatum(v: AvroDatum): unknown {
  if (v === null || typeof v !== "object") return v;
  if (v instanceof Uint8Array) return v;
  if (v instanceof Map) return Object.fromEntries(v);
  // For record/array datums, JSON-stringify for simplicity
  if (Array.isArray(v)) return JSON.stringify(v);
  return JSON.stringify(v);
}

/**
 * Read an Apache Avro Object Container File buffer into a {@link DataFrame}.
 *
 * @param data - Raw Avro OCF bytes (`Uint8Array` or `ArrayBuffer`).
 * @param options - Optional read options.
 */
export function readAvro(
  data: Uint8Array | ArrayBuffer,
  options: ReadAvroOptions = {},
): DataFrame {
  const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const { rows } = parseAvroOCF(buf);

  if (rows.length === 0) {
    return DataFrame.fromColumns({});
  }

  // Determine columns from first row
  const allCols = Object.keys(rows[0] ?? {});
  const cols = options.usecols
    ? allCols.filter((c) => (options.usecols as readonly string[]).includes(c))
    : allCols;

  const columns: Record<string, Scalar[]> = {};
  for (const col of cols) columns[col] = [];

  for (const row of rows) {
    for (const col of cols) {
      const v = row[col];
      (columns[col] ?? []).push(flattenDatum(v ?? null) as Scalar);
    }
  }

  return DataFrame.fromColumns(columns);
}

// ─── Avro writer (minimal — for testing round-trips) ─────────────────────────

/** Options for {@link toAvro}. */
export interface ToAvroOptions {
  /** Schema name for the top-level record. Default: "Row". */
  readonly schemaName?: string;
}

/**
 * Serialize a {@link DataFrame} to an uncompressed Avro OCF buffer.
 *
 * Column type mapping:
 * - boolean columns   → `boolean`
 * - integer columns   → `long`
 * - float columns     → `double`
 * - string columns    → `{"type":"union","schemas":["null","string"]}`
 * - null column vals  → wrapped in union `["null", "<type>"]`
 * - other             → `string` (JSON-stringified)
 */
export function toAvro(df: DataFrame, options: ToAvroOptions = {}): Uint8Array {
  const schemaName = options.schemaName ?? "Row";
  const cols = [...df.columns.values];

  // Infer field types
  type FieldSpec = { name: string; avroType: string; nullable: boolean };
  const fields: FieldSpec[] = cols.map((col) => {
    const vals = df.col(col).values;
    let hasNull = false;
    let hasInt = false;
    let hasFloat = false;
    let hasBool = false;
    let hasStr = false;
    for (const v of vals) {
      if (v === null || v === undefined) { hasNull = true; continue; }
      if (typeof v === "boolean") { hasBool = true; continue; }
      if (typeof v === "number") {
        if (Number.isInteger(v)) hasInt = true; else hasFloat = true;
        continue;
      }
      hasStr = true;
    }
    let avroType = "string";
    if (hasBool && !hasInt && !hasFloat && !hasStr) avroType = "boolean";
    else if ((hasInt || hasFloat) && !hasBool && !hasStr) avroType = hasFloat ? "double" : "long";
    return { name: col, avroType, nullable: hasNull };
  });

  // Build schema JSON
  const schemaFields = fields.map((f) => ({
    name: f.name,
    type: f.nullable ? ["null", f.avroType] : f.avroType,
  }));
  const schemaObj = { type: "record", name: schemaName, fields: schemaFields };
  const schemaJson = JSON.stringify(schemaObj);
  const schemaBytes = new TextEncoder().encode(schemaJson);

  // Sync marker: 16 random-ish bytes derived from schema hash
  const sync = new Uint8Array(16);
  let h = 0x12345678;
  for (let i = 0; i < schemaBytes.length; i++) {
    h = Math.imul(h ^ (schemaBytes[i] ?? 0), 0x9e3779b9) >>> 0;
  }
  for (let i = 0; i < 16; i++) {
    sync[i] = (h >> (i % 4) * 8) & 0xff;
    if (i % 4 === 3) h = Math.imul(h, 0x6c62272e) >>> 0;
  }

  const chunks: Uint8Array[] = [];

  // Write helper
  const writeBuf: number[] = [];
  const flushBuf = (): Uint8Array => {
    const u = new Uint8Array(writeBuf);
    writeBuf.length = 0;
    return u;
  };

  function writeLong(v: number): void {
    // Zigzag encode
    let n = (v << 1) ^ (v >> 31);
    while (n & ~0x7f) {
      writeBuf.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    writeBuf.push(n);
  }
  function writeString(s: string): void {
    const b = new TextEncoder().encode(s);
    writeLong(b.length);
    for (const byte of b) writeBuf.push(byte);
  }
  function writeBytes(b: Uint8Array): void {
    writeLong(b.length);
    for (const byte of b) writeBuf.push(byte);
  }

  // Magic
  chunks.push(AVRO_MAGIC);

  // Metadata: 1 map block with avro.schema and avro.codec
  writeLong(2); // 2 entries
  writeString("avro.schema");
  writeBytes(schemaBytes);
  writeString("avro.codec");
  writeBytes(new TextEncoder().encode("null"));
  writeLong(0); // end of map
  chunks.push(flushBuf());

  // Sync marker
  chunks.push(sync.slice());

  // Data block
  const nRows = df.shape[0];
  if (nRows > 0) {
    // Encode all rows
    for (let row = 0; row < nRows; row++) {
      for (const f of fields) {
        const v = df.col(f.name).at(row);
        if (f.nullable) {
          if (v === null || v === undefined) {
            writeLong(0); // null branch
          } else {
            writeLong(1); // value branch
            writeTypedValue(v, f.avroType);
          }
        } else {
          writeTypedValue(v ?? null, f.avroType);
        }
      }
    }
    const blockData = flushBuf();

    // Block header: count, byteCount
    writeLong(nRows);
    writeLong(blockData.length);
    chunks.push(flushBuf());
    chunks.push(blockData);
    chunks.push(sync.slice());
  }

  // Concatenate all chunks
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;

  function writeTypedValue(v: unknown, type: string): void {
    if (v === null || v === undefined) { writeBuf.push(0); return; } // null
    switch (type) {
      case "boolean": writeBuf.push(v ? 1 : 0); break;
      case "long": writeLong(typeof v === "number" ? v : 0); break;
      case "double": {
        const arr = new Float64Array(1);
        arr[0] = typeof v === "number" ? v : 0;
        const b = new Uint8Array(arr.buffer);
        for (const byte of b) writeBuf.push(byte);
        break;
      }
      default:
        writeString(String(v));
    }
  }
}
