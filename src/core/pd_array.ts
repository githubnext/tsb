/**
 * pd.array — factory function for creating pandas-compatible arrays.
 *
 * Mirrors `pandas.array()`. Accepts a sequence of values and an optional dtype
 * hint, and returns a typed array wrapper suitable for use with tsb Series and
 * DataFrames.
 *
 * @example
 * ```ts
 * import { pdArray } from "tsb";
 *
 * const a = pdArray([1, 2, 3], "int64");
 * a.dtype;       // "int64"
 * a.length;      // 3
 * a.toArray();   // [1, 2, 3]
 *
 * const b = pdArray(["a", "b", null], "string");
 * b.dtype;       // "string"
 * b.toArray();   // ["a", "b", null]
 * ```
 *
 * @module
 */

import type { DtypeName, Scalar } from "../types.ts";

/**
 * A lightweight typed array returned by {@link pdArray}.
 *
 * Mirrors the minimal public interface of a pandas ExtensionArray / ndarray
 * that tsb needs for interop.
 */
export class PandasArray {
  readonly dtype: DtypeName;
  readonly length: number;
  private readonly _data: readonly Scalar[];

  /** @internal */
  constructor(data: readonly Scalar[], dtype: DtypeName) {
    this._data = data;
    this.dtype = dtype;
    this.length = data.length;
  }

  /** Return the element at position `i` (0-based). */
  at(i: number): Scalar {
    return this._data[i] ?? null;
  }

  /** Return a plain JS array copy of the underlying data. */
  toArray(): Scalar[] {
    return Array.from(this._data);
  }

  /** Iterate over elements. */
  [Symbol.iterator](): Iterator<Scalar> {
    return this._data[Symbol.iterator]();
  }

  /** @internal */
  toString(): string {
    return `PandasArray([${this._data.join(", ")}], dtype='${this.dtype}')`;
  }
}

// ─── dtype inference ──────────────────────────────────────────────────────────

function classifyScalar(v: Scalar): "date" | "bigint" | "float" | "int" | "string" | "bool" | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (v instanceof Date) {
    return "date";
  }
  if (typeof v === "bigint") {
    return "bigint";
  }
  if (typeof v === "number") {
    return Number.isInteger(v) ? "int" : "float";
  }
  if (typeof v === "string") {
    return "string";
  }
  if (typeof v === "boolean") {
    return "bool";
  }
  return null;
}

function inferDtype(data: readonly Scalar[]): DtypeName {
  const kinds = new Set<"date" | "bigint" | "float" | "int" | "string" | "bool">();
  for (const v of data) {
    const kind = classifyScalar(v);
    if (kind !== null) {
      kinds.add(kind);
    }
  }
  return resolveDtype(kinds);
}

function resolveDtype(
  kinds: ReadonlySet<"date" | "bigint" | "float" | "int" | "string" | "bool">,
): DtypeName {
  if (kinds.has("date")) {
    return "datetime";
  }
  if (kinds.has("bigint")) {
    return "int64";
  }
  if (kinds.has("float")) {
    return "float64";
  }
  if (kinds.has("int") && !kinds.has("string") && !kinds.has("bool")) {
    return "int64";
  }
  if (kinds.has("bool") && !kinds.has("int") && !kinds.has("float") && !kinds.has("string")) {
    return "bool";
  }
  if (kinds.has("string")) {
    return "string";
  }
  return "object";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a {@link PandasArray} from a sequence of values.
 *
 * Mirrors `pandas.array(data, dtype=None)`.
 *
 * @param data  - Iterable of scalar values (may include `null`/`undefined` for NA).
 * @param dtype - Optional dtype hint. When omitted the dtype is inferred from
 *   the data (similar to pandas' inference rules).
 * @returns A {@link PandasArray} with the given (or inferred) dtype.
 *
 * @example
 * ```ts
 * pdArray([1, 2, 3]);               // dtype inferred as "int64"
 * pdArray([1.5, 2.5], "float32");   // dtype forced to "float32"
 * pdArray(["a", null, "c"]);        // dtype inferred as "string"
 * ```
 */
export function pdArray(data: Iterable<Scalar>, dtype?: DtypeName): PandasArray {
  const arr = Array.from(data);
  const resolvedDtype = dtype ?? inferDtype(arr);
  return new PandasArray(arr, resolvedDtype);
}
