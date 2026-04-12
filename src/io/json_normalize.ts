/**
 * jsonNormalize — Normalize semi-structured JSON data into a flat DataFrame.
 *
 * Mirrors `pandas.json_normalize()`:
 * - Flattens nested dicts using a separator (default `"."`)
 * - Optionally unpacks a nested list of records via `recordPath`
 * - Keeps parent-level fields as metadata columns via `meta`
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── JSON value types (no `any`) ─────────────────────────────────────────────

/** A JSON primitive leaf value. */
type JsonPrimitive = string | number | boolean | null;

/** Any valid JSON value. */
type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

/** A plain JSON object. */
interface JsonObject {
  [key: string]: JsonValue;
}

// ─── Public types ─────────────────────────────────────────────────────────────

/** Options for {@link jsonNormalize}. */
export interface JsonNormalizeOptions {
  /**
   * Path to the nested list of records to unpack.
   * Can be a dot-separated string key or an array of keys for nested paths.
   * When omitted, the top-level object(s) are flattened directly.
   */
  readonly recordPath?: string | readonly string[];

  /**
   * List of fields (or nested paths) from the parent level to include as
   * metadata columns alongside each unpacked record row.
   * Each entry is a key string or an array of keys for a nested path.
   */
  readonly meta?: ReadonlyArray<string | readonly string[]>;

  /** Prefix prepended to each metadata column name. Default: `""`. */
  readonly metaPrefix?: string;

  /** Prefix prepended to each record column name. Default: `""`. */
  readonly recordPrefix?: string;

  /**
   * Separator used when joining nested key names into a flat column name.
   * Default: `"."`.
   */
  readonly sep?: string;

  /**
   * Maximum depth of nesting to flatten. `0` means no flattening (objects are
   * serialised to JSON strings). `undefined` means unlimited. Default: unlimited.
   */
  readonly maxLevel?: number;

  /**
   * What to do when a `meta` path is missing from an object:
   * - `"raise"` — throw an error (default)
   * - `"ignore"` — silently use `null`
   */
  readonly errors?: "raise" | "ignore";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Return true if `v` is a non-null, non-array plain object. */
function isJsonObject(v: JsonValue): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Return true if `v` is a JSON primitive (leaf). */
function isJsonPrimitive(v: JsonValue): v is JsonPrimitive {
  return !isJsonObject(v) && !Array.isArray(v);
}

/** Convert a path argument to an array of string keys. */
function toPath(p: string | readonly string[]): readonly string[] {
  return typeof p === "string" ? [p] : p;
}

/**
 * Walk an object along a sequence of keys, returning the value at the end.
 * Returns `null` if any step is missing or not an object.
 */
function navigatePath(obj: JsonObject, path: readonly string[]): JsonValue {
  let cur: JsonValue = obj;
  for (const key of path) {
    if (!isJsonObject(cur)) return null;
    cur = cur[key] ?? null;
  }
  return cur;
}

/**
 * Flatten one JSON object into a `Record<string, Scalar>`.
 * Nested objects are expanded up to `depth < maxLevel`.
 */
function flattenObject(
  obj: JsonObject,
  sep: string,
  maxLevel: number,
  prefix: string,
  depth: number,
): Record<string, Scalar> {
  const result: Record<string, Scalar> = {};
  for (const [key, value] of Object.entries(obj)) {
    const flatKey = prefix.length > 0 ? `${prefix}${sep}${key}` : key;
    if (depth < maxLevel && isJsonObject(value)) {
      const nested = flattenObject(value, sep, maxLevel, flatKey, depth + 1);
      for (const [k, v] of Object.entries(nested)) {
        result[k] = v;
      }
    } else {
      result[flatKey] = primitiveOrStringify(value);
    }
  }
  return result;
}

/** Convert a JsonValue to a `Scalar`: pass primitives through, stringify the rest. */
function primitiveOrStringify(value: JsonValue): Scalar {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return JSON.stringify(value);
}

/** Apply a prefix to every key of a flat record. */
function prefixRecord(
  record: Record<string, Scalar>,
  prefix: string,
): Record<string, Scalar> {
  if (prefix === "") return record;
  const out: Record<string, Scalar> = {};
  for (const [k, v] of Object.entries(record)) {
    out[prefix + k] = v;
  }
  return out;
}

/**
 * Build the metadata portion of a row from the parent object.
 * Complex values (objects/arrays) are serialised to JSON when errors="raise",
 * or replaced with null when errors="ignore".
 */
function buildMetaRecord(
  parent: JsonObject,
  metaPaths: ReadonlyArray<readonly string[]>,
  metaPrefix: string,
  sep: string,
  errors: "raise" | "ignore",
): Record<string, Scalar> {
  const meta: Record<string, Scalar> = {};
  for (const path of metaPaths) {
    const colName = metaPrefix + path.join(sep);
    const val = navigatePath(parent, path);
    if (isJsonPrimitive(val)) {
      meta[colName] = val;
    } else if (errors === "ignore") {
      meta[colName] = null;
    } else {
      meta[colName] = JSON.stringify(val);
    }
  }
  return meta;
}

/** Extract a list of records from a parent object following `recordPath`. */
function extractRecords(parent: JsonObject, recordPath: readonly string[]): JsonObject[] {
  const val = navigatePath(parent, recordPath);
  if (!Array.isArray(val)) return [];
  return val.filter(isJsonObject);
}

/**
 * Flatten a single parent object (no recordPath) into rows, also appending
 * any explicit meta columns.
 */
function flattenTopLevel(
  parent: JsonObject,
  sep: string,
  maxLevel: number,
  recordPrefix: string,
  metaPaths: ReadonlyArray<readonly string[]>,
  metaPrefix: string,
  errors: "raise" | "ignore",
): Record<string, Scalar> {
  const flat = prefixRecord(flattenObject(parent, sep, maxLevel, "", 0), recordPrefix);
  const meta = buildMetaRecord(parent, metaPaths, metaPrefix, sep, errors);
  return { ...flat, ...meta };
}

/**
 * Flatten rows that come from unpacking a `recordPath`, merging parent meta.
 */
function flattenRecordRows(
  parent: JsonObject,
  recordPath: readonly string[],
  sep: string,
  maxLevel: number,
  recordPrefix: string,
  metaPaths: ReadonlyArray<readonly string[]>,
  metaPrefix: string,
  errors: "raise" | "ignore",
): Record<string, Scalar>[] {
  const records = extractRecords(parent, recordPath);
  const meta = buildMetaRecord(parent, metaPaths, metaPrefix, sep, errors);
  return records.map((rec) => {
    const flat = prefixRecord(flattenObject(rec, sep, maxLevel, "", 0), recordPrefix);
    return { ...flat, ...meta };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Normalize semi-structured JSON data into a flat DataFrame.
 *
 * Mirrors `pandas.json_normalize()`.
 *
 * @param data - A single JSON object or an array of JSON objects to normalize.
 * @param options - Normalization options.
 * @returns A DataFrame with one row per normalized record.
 *
 * @example
 * ```ts
 * import { jsonNormalize } from "tsb";
 *
 * const data = [
 *   { id: 1, name: { first: "Alice", last: "Smith" }, score: 95 },
 *   { id: 2, name: { first: "Bob",   last: "Jones" }, score: 87 },
 * ];
 * const df = jsonNormalize(data);
 * // Columns: id, name.first, name.last, score
 * ```
 *
 * @example With recordPath and meta:
 * ```ts
 * const school = {
 *   school: "MIT",
 *   students: [
 *     { name: "Alice", grade: "A" },
 *     { name: "Bob",   grade: "B" },
 *   ],
 * };
 * const df = jsonNormalize(school, { recordPath: "students", meta: ["school"] });
 * // Columns: name, grade, school
 * ```
 */
export function jsonNormalize(
  data: JsonObject | readonly JsonObject[],
  options: JsonNormalizeOptions = {},
): DataFrame {
  const sep = options.sep ?? ".";
  const maxLevel = options.maxLevel ?? Number.POSITIVE_INFINITY;
  const metaPrefix = options.metaPrefix ?? "";
  const recordPrefix = options.recordPrefix ?? "";
  const errors = options.errors ?? "raise";
  const recordPath = options.recordPath !== undefined ? toPath(options.recordPath) : null;
  const metaPaths: ReadonlyArray<readonly string[]> =
    options.meta !== undefined ? options.meta.map(toPath) : [];

  const rows: readonly JsonObject[] = Array.isArray(data) ? data : [data];
  const flatRows: Record<string, Scalar>[] = [];

  for (const parent of rows) {
    if (recordPath !== null) {
      const expanded = flattenRecordRows(
        parent,
        recordPath,
        sep,
        maxLevel,
        recordPrefix,
        metaPaths,
        metaPrefix,
        errors,
      );
      for (const row of expanded) {
        flatRows.push(row);
      }
    } else {
      flatRows.push(
        flattenTopLevel(parent, sep, maxLevel, recordPrefix, metaPaths, metaPrefix, errors),
      );
    }
  }

  if (flatRows.length === 0) {
    return DataFrame.fromRecords([]);
  }

  return DataFrame.fromRecords(flatRows);
}
