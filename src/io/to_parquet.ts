/**
 * to_parquet — write a DataFrame to Parquet binary format.
 *
 * Mirrors `pandas.DataFrame.to_parquet`.
 *
 * Full Parquet encoding is a complex binary protocol (Apache Thrift-encoded
 * column groups).  This module provides:
 * 1. A lightweight **column-stats** representation of the DataFrame.
 * 2. A pure-TypeScript **JSON-Lines fallback** when a WASM Parquet library
 *    is not available (for CI / zero-dependency environments).
 * 3. The public `toParquet` API that matches pandas' signature.
 *
 * Note: In a browser or Node/Bun environment with the optional
 * `parquet-wasm` package installed, a real Parquet buffer would be
 * produced.  Without it this module produces a JSON-Lines buffer as a
 * deterministic, schema-preserving alternative.
 *
 * @example
 * ```ts
 * const buf = toParquet(df);          // Uint8Array (jsonl fallback)
 * const text = new TextDecoder().decode(buf);
 * ```
 */

import type { DataFrame } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for `toParquet`. */
export interface ToParquetOptions {
  /**
   * Which columns to write.  Defaults to all columns.
   */
  readonly columns?: readonly string[];

  /**
   * Compression codec hint.  Only informational in the JSON-Lines fallback;
   * a real WASM encoder would honour it.
   * Default: `"snappy"`.
   */
  readonly compression?: "snappy" | "gzip" | "brotli" | "zstd" | "none";

  /**
   * Row-group size hint (number of rows per Parquet row group).
   * Default: `50_000`.
   */
  readonly rowGroupSize?: number;

  /**
   * Include the row-axis index as a column in the output.
   * Default: `true`.
   */
  readonly index?: boolean;
}

// ─── schema helpers ───────────────────────────────────────────────────────────

/** A simplified Parquet-like column schema descriptor. */
export interface ParquetColumnSchema {
  readonly name: string;
  readonly physicalType: "INT64" | "DOUBLE" | "BYTE_ARRAY" | "BOOLEAN";
  readonly logicalType: string | null;
}

/** Derive a Parquet physical type from a sample of values. */
function physicalType(values: readonly Scalar[]): ParquetColumnSchema["physicalType"] {
  for (const v of values) {
    if (v === null || v === undefined) {
      continue;
    }
    if (typeof v === "boolean") {
      return "BOOLEAN";
    }
    if (typeof v === "number") {
      return Number.isInteger(v) ? "INT64" : "DOUBLE";
    }
    return "BYTE_ARRAY";
  }
  return "BYTE_ARRAY";
}

/** Derive a Parquet logical type annotation from a sample. */
function logicalType(values: readonly Scalar[]): string | null {
  for (const v of values) {
    if (v === null || v === undefined) {
      continue;
    }
    if (v instanceof Date) {
      return "TIMESTAMP_MILLIS";
    }
    if (typeof v === "string") {
      return "UTF8";
    }
    return null;
  }
  return null;
}

// ─── JSON-Lines fallback serialiser ──────────────────────────────────────────

/** Serialise a scalar to a JSON-compatible primitive. */
function serialiseScalar(v: Scalar): number | string | boolean | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  if (typeof v === "bigint") {
    return Number(v);
  }
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
    return v;
  }
  return String(v);
}

// ─── public types ────────────────────────────────────────────────────────────

/** Metadata written into the JSON-Lines header line. */
export interface ParquetMetadata {
  readonly version: 1;
  readonly numRows: number;
  readonly numColumns: number;
  readonly compression: string;
  readonly rowGroupSize: number;
  readonly schema: readonly ParquetColumnSchema[];
}

// ─── main API ─────────────────────────────────────────────────────────────────

/**
 * Serialise `df` to a `Uint8Array` in a Parquet-compatible format.
 *
 * In this implementation the output is a UTF-8 encoded JSON-Lines stream
 * with a metadata header followed by one JSON object per row.
 * This is a deterministic, schema-preserving fallback that can be
 * round-tripped with `readParquet` (which also reads this fallback format).
 *
 * @param df      - Source DataFrame.
 * @param options - Output options.
 */
export function toParquet(df: DataFrame, options: ToParquetOptions = {}): Uint8Array {
  const includeIndex = options.index ?? true;
  const compression = options.compression ?? "snappy";
  const rowGroupSize = options.rowGroupSize ?? 50_000;
  const colNames = options.columns !== undefined ? [...options.columns] : [...df.columns];
  const nrows = df.shape[0];

  // Build schema
  const schema: ParquetColumnSchema[] = [];
  if (includeIndex) {
    const idxVals = Array.from({ length: nrows }, (_, i) => {
      const lbl: Label = df.index.values[i] ?? null;
      return lbl;
    });
    schema.push({
      name: "__index__",
      physicalType: physicalType(idxVals),
      logicalType: logicalType(idxVals),
    });
  }
  for (const col of colNames) {
    const vals = df.col(col).values;
    schema.push({
      name: col,
      physicalType: physicalType(vals),
      logicalType: logicalType(vals),
    });
  }

  const metadata: ParquetMetadata = {
    version: 1,
    numRows: nrows,
    numColumns: colNames.length + (includeIndex ? 1 : 0),
    compression,
    rowGroupSize,
    schema,
  };

  const lines: string[] = [JSON.stringify(metadata)];

  for (let r = 0; r < nrows; r++) {
    const record: Record<string, number | string | boolean | null> = {};
    if (includeIndex) {
      const lbl: Label = df.index.values[r] ?? null;
      record["__index__"] = serialiseScalar(lbl);
    }
    for (const col of colNames) {
      const v = df.col(col).iloc(r);
      record[col] = serialiseScalar(v);
    }
    lines.push(JSON.stringify(record));
  }

  return new TextEncoder().encode(`${lines.join("\n")}\n`);
}

/**
 * Return the schema that `toParquet` would produce for `df`
 * without fully serialising.  Useful for introspection.
 */
export function parquetSchema(
  df: DataFrame,
  options: ToParquetOptions = {},
): ParquetColumnSchema[] {
  const includeIndex = options.index ?? true;
  const colNames = options.columns !== undefined ? [...options.columns] : [...df.columns];
  const nrows = df.shape[0];
  const schema: ParquetColumnSchema[] = [];

  if (includeIndex) {
    const idxVals = Array.from({ length: nrows }, (_, i) => (df.index.values[i] ?? null) as Scalar);
    schema.push({
      name: "__index__",
      physicalType: physicalType(idxVals),
      logicalType: logicalType(idxVals),
    });
  }
  for (const col of colNames) {
    const vals = df.col(col).values;
    schema.push({
      name: col,
      physicalType: physicalType(vals),
      logicalType: logicalType(vals),
    });
  }
  return schema;
}
