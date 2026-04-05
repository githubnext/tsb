/**
 * Memory usage estimation for Series and DataFrame.
 *
 * Mirrors `pandas.Series.memory_usage` and `pandas.DataFrame.memory_usage`:
 * estimates in-memory bytes for each column using dtype-based or deep
 * (value-by-value) accounting.
 *
 * @example
 * ```ts
 * import { memoryUsage, dataFrameMemoryUsage } from "tsb";
 * const s = new Series({ data: [1, 2, 3], dtype: Dtype.float64 });
 * memoryUsage(s); // 3 * 8 = 24
 * ```
 */

import type { Scalar } from "../types.ts";
import type { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for memory usage estimation. */
export interface MemoryUsageOptions {
  /** Include index memory in total. Default: false */
  index?: boolean;
  /** If true, includes object overhead (deep inspection). Default: false */
  deep?: boolean;
}

// ─── dtype-based bytes-per-element ───────────────────────────────────────────

/** Bytes per element for numeric dtypes based on itemsize. */
function dtypeBytesPerElement(dtype: { kind: string; itemsize: number }): number | null {
  switch (dtype.kind) {
    case "int":
    case "uint":
    case "float":
      return dtype.itemsize;
    case "bool":
      return 1;
    case "datetime":
    case "timedelta":
      return 8;
    case "category":
      return 4;
    default:
      return null;
  }
}

// ─── deep value sizing ────────────────────────────────────────────────────────

/** Estimate bytes for a single scalar value (deep mode). */
function scalarBytes(v: Scalar): number {
  if (v === null || v === undefined) {
    return 0;
  }
  if (typeof v === "number") {
    return 8;
  }
  if (typeof v === "boolean") {
    return 1;
  }
  if (typeof v === "string") {
    return 2 * v.length + 56;
  }
  if (typeof v === "bigint") {
    return 8;
  }
  if (v instanceof Date) {
    return 8;
  }
  return 8;
}

/** Estimate total bytes for an array of scalars (deep mode). */
function deepBytes(values: readonly Scalar[]): number {
  let total = 0;
  for (const v of values) {
    total += scalarBytes(v);
  }
  return total;
}

/** Estimate total bytes for string/object dtype columns. */
function stringColumnBytes(values: readonly Scalar[]): number {
  let total = 0;
  for (const v of values) {
    if (typeof v === "string") {
      total += 2 * v.length + 56;
    } else if (v !== null && v !== undefined) {
      total += 8;
    }
  }
  return total;
}

// ─── index memory ─────────────────────────────────────────────────────────────

/** Estimate index memory in bytes (8 bytes per label as pointer/number). */
function indexBytes(size: number): number {
  return size * 8;
}

// ─── memoryUsage ─────────────────────────────────────────────────────────────

/**
 * Estimate memory usage of a Series in bytes.
 *
 * Uses dtype to estimate bytes per element. For object/string dtypes the
 * actual string lengths are summed. When `deep=true`, each value is
 * individually sized.
 *
 * @param series  - The Series to measure.
 * @param options - Estimation options.
 * @returns Estimated bytes used by the Series data.
 *
 * @example
 * ```ts
 * memoryUsage(new Series({ data: [1, 2, 3], dtype: Dtype.int32 })); // 12
 * ```
 */
export function memoryUsage(series: Series<Scalar>, options?: MemoryUsageOptions): number {
  const deep = options?.deep ?? false;
  const includeIndex = options?.index ?? false;
  const n = series.values.length;
  const dtype = series.dtype;

  let dataBytes: number;
  if (deep) {
    dataBytes = deepBytes(series.values);
  } else {
    const bytesPerElem = dtypeBytesPerElement(dtype);
    if (bytesPerElem !== null) {
      dataBytes = n * bytesPerElem;
      if (dtype.kind === "category") {
        // category dict overhead: unique values * 8 bytes
        const uniq = new Set(series.values).size;
        dataBytes += uniq * 8;
      }
    } else if (dtype.kind === "string" || dtype.kind === "object") {
      dataBytes = stringColumnBytes(series.values);
    } else {
      dataBytes = n * 8;
    }
  }

  const indexMem = includeIndex ? indexBytes(n) : 0;
  return dataBytes + indexMem;
}

// ─── dataFrameMemoryUsage ────────────────────────────────────────────────────

/**
 * Estimate memory usage of a DataFrame in bytes per column.
 *
 * Returns a `Series<number>` indexed by column name, with an optional
 * `"Index"` entry when `index=true`.
 *
 * @param df      - The DataFrame to measure.
 * @param options - Estimation options.
 * @returns A `Series<number>` with per-column byte estimates.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: ["x", "y", "z"] });
 * const usage = dataFrameMemoryUsage(df);
 * usage.col("a"); // 24
 * ```
 */
export function dataFrameMemoryUsage(df: DataFrame, options?: MemoryUsageOptions): Series<number> {
  const includeIndex = options?.index ?? false;
  const names: string[] = [];
  const values: number[] = [];

  if (includeIndex) {
    names.push("Index");
    values.push(indexBytes(df.index.size));
  }

  for (const colName of df.columns.values) {
    names.push(colName);
    values.push(memoryUsage(df.col(colName), { deep: options?.deep ?? false }));
  }

  return new Series<number>({ data: values, index: names });
}
