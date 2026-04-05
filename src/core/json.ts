/**
 * json — JSON normalization utilities.
 *
 * Mirrors `pandas.json_normalize`: flattens semi-structured, nested JSON
 * objects into a flat record suitable for constructing a `DataFrame`.  Nested
 * objects are expanded with a separator between key levels; nested arrays can
 * be targeted via `recordPath`.
 *
 * @example
 * ```ts
 * import { jsonNormalize } from "tsb";
 *
 * const data = [
 *   { id: 1, user: { name: "Alice", city: "NY" } },
 *   { id: 2, user: { name: "Bob",   city: "LA" } },
 * ];
 *
 * const df = jsonNormalize(data);
 * // columns: id, user.name, user.city
 * df.columns.values;  // ["id", "user.name", "user.city"]
 * ```
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";

// ─── JSON value types ─────────────────────────────────────────────────────────

/** A plain-old-JavaScript-object that maps string keys to JSON values. */
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/**
 * A plain-old-JavaScript-object value accepted by `jsonNormalize`.
 * Using an interface indirection to allow recursive type definition.
 */
export type JsonValue = Scalar | readonly JsonValue[] | JsonObject;

/** A JSON record (object) that can be normalized. */
export type JsonRecord = JsonObject;

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for `jsonNormalize()`. */
export interface JsonNormalizeOptions {
  /**
   * Separator inserted between key levels when flattening nested objects.
   * @default "."
   */
  readonly sep?: string;
  /**
   * Path to a nested list of records inside each top-level object.
   * E.g. `["data", "items"]` navigates `obj.data.items` for each `obj`.
   * When provided, the items in the nested list are the rows of the result.
   */
  readonly recordPath?: readonly string[];
  /**
   * List of keys (or key paths) from the parent object to include as metadata
   * columns alongside each record.  Only meaningful when `recordPath` is set.
   * Each entry is either a key string or an array of strings representing a
   * nested path.
   */
  readonly meta?: readonly (string | readonly string[])[];
  /**
   * Maximum nesting depth to flatten.  Deeper objects are left as serialised
   * strings.  Defaults to unlimited (`Infinity`).
   */
  readonly maxLevel?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a plain object (not null, not array). */
function isPlainObject(v: JsonValue): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Recursively flatten a plain object with key-separator. */
function flattenObject(
  obj: JsonRecord,
  sep: string,
  maxLevel: number,
  depth: number,
  prefix: string,
  result: Map<string, Scalar>,
): void {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix.length > 0 ? `${prefix}${sep}${k}` : k;
    if (isPlainObject(v) && depth < maxLevel) {
      flattenObject(v, sep, maxLevel, depth + 1, fullKey, result);
    } else if (Array.isArray(v)) {
      result.set(fullKey, JSON.stringify(v));
    } else {
      result.set(fullKey, v as Scalar);
    }
  }
}

/** Navigate a path of keys into a JSON value. */
function navigatePath(obj: JsonValue, path: readonly string[]): JsonValue {
  let cur: JsonValue = obj;
  for (const key of path) {
    if (!isPlainObject(cur)) {
      throw new Error(`Cannot navigate key '${key}' on non-object value`);
    }
    const next = cur[key];
    if (next === undefined) {
      throw new Error(`Key '${key}' not found in object`);
    }
    cur = next;
  }
  return cur;
}

/** Extract a scalar value from a JSON object at the given path. */
function extractMeta(obj: JsonRecord, path: string | readonly string[]): Scalar {
  const keys: readonly string[] = typeof path === "string" ? [path] : path;
  const val = navigatePath(obj, keys);
  if (isPlainObject(val)) {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return JSON.stringify(val);
  }
  return val as Scalar;
}

/** Flatten a single JSON record into a string→Scalar map. */
function flattenRecord(record: JsonRecord, sep: string, maxLevel: number): Map<string, Scalar> {
  const result = new Map<string, Scalar>();
  flattenObject(record, sep, maxLevel, 0, "", result);
  return result;
}

/** Build column arrays from a list of flat record maps. */
function buildColumnArrays(flatRecords: readonly Map<string, Scalar>[]): Map<string, Scalar[]> {
  const columns = new Map<string, Scalar[]>();

  // First pass: collect all unique keys in order
  for (const rec of flatRecords) {
    for (const key of rec.keys()) {
      if (!columns.has(key)) {
        columns.set(key, []);
      }
    }
  }

  // Second pass: fill column arrays (null for missing)
  for (const rec of flatRecords) {
    for (const [key, arr] of columns) {
      arr.push(rec.has(key) ? (rec.get(key) as Scalar) : null);
    }
  }

  return columns;
}

/** Extract records from each top-level object following `recordPath`. */
function extractRecordsWithMeta(
  data: readonly JsonRecord[],
  recordPath: readonly string[],
  meta: readonly (string | readonly string[])[],
  sep: string,
  maxLevel: number,
): Map<string, Scalar>[] {
  const flatRecords: Map<string, Scalar>[] = [];

  for (const parentObj of data) {
    const recordList = navigatePath(parentObj, recordPath);
    if (!Array.isArray(recordList)) {
      throw new Error(`recordPath '${recordPath.join(".")}' did not point to an array`);
    }

    // Pre-extract meta values from parent
    const metaValues = meta.map((path) => extractMeta(parentObj, path));

    for (const item of recordList) {
      const record = isPlainObject(item) ? item : { value: item };
      const flat = flattenRecord(record as JsonRecord, sep, maxLevel);

      // Append meta columns
      for (let i = 0; i < meta.length; i++) {
        const path = meta[i];
        const metaKey = Array.isArray(path)
          ? (path as readonly string[]).join(sep)
          : (path as string);
        flat.set(metaKey, metaValues[i] as Scalar);
      }

      flatRecords.push(flat);
    }
  }

  return flatRecords;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Normalize semi-structured JSON data into a flat `DataFrame`.
 *
 * @param data    - Array of JSON records to normalize.
 * @param options - Normalization options.
 */
export function jsonNormalize(
  data: readonly JsonRecord[],
  options: JsonNormalizeOptions = {},
): DataFrame {
  const sep = options.sep ?? ".";
  const maxLevel = options.maxLevel ?? Number.POSITIVE_INFINITY;
  const recordPath = options.recordPath;
  const meta = options.meta ?? [];

  let flatRecords: Map<string, Scalar>[];

  if (recordPath !== undefined && recordPath.length > 0) {
    flatRecords = extractRecordsWithMeta(data, recordPath, meta, sep, maxLevel);
  } else {
    flatRecords = data.map((rec) => flattenRecord(rec, sep, maxLevel));
  }

  if (flatRecords.length === 0) {
    return DataFrame.fromColumns({});
  }

  const columnArrays = buildColumnArrays(flatRecords);

  const colData: Record<string, readonly Scalar[]> = {};
  for (const [key, arr] of columnArrays) {
    colData[key] = arr;
  }

  return DataFrame.fromColumns(colData);
}

/**
 * Flatten a single JSON record into a plain object.
 *
 * Useful when you need the intermediate flat representation without building
 * a DataFrame.
 *
 * @param record   - The object to flatten.
 * @param sep      - Key separator. @default "."
 * @param maxLevel - Max depth. @default Infinity
 */
export function flattenJson(
  record: JsonRecord,
  sep = ".",
  maxLevel: number = Number.POSITIVE_INFINITY,
): Record<string, Scalar> {
  const result = flattenRecord(record, sep, maxLevel);
  const out: Record<string, Scalar> = {};
  for (const [k, v] of result) {
    out[k] = v;
  }
  return out;
}
