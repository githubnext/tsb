/**
 * read_parquet — Parquet file reader stub.
 *
 * A minimal stub that reads Parquet files by delegating to a WASM-based
 * decoder when available, or throws a helpful error in environments that
 * lack it.  Full implementation will be added in a future iteration once
 * a WASM Parquet library (e.g. parquet-wasm) is vendored.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";

/** Options for `readParquet`. */
export interface ReadParquetOptions {
  /** Columns to read. If omitted, all columns are read. */
  columns?: readonly string[];
  /** Number of rows to read (from the start). If omitted, all rows are read. */
  nrows?: number;
  /**
   * Row group indices to include. If omitted, all row groups are included.
   * Only meaningful once full Parquet decoding is implemented.
   */
  rowGroups?: readonly number[];
}

/**
 * Read a Parquet file and return a DataFrame.
 *
 * **Status**: stub — full Parquet decoding requires a WASM decoder.
 *
 * When called in a runtime that has `globalThis.__parquetDecoder` set to a
 * compatible decoder object (shape: `{ decode(buf: Uint8Array): unknown[] }`),
 * this function forwards the raw bytes to the decoder and constructs a
 * DataFrame from the resulting record array.
 *
 * In all other environments the function throws a `TypeError` explaining what
 * is needed.
 *
 * @param source - A `Uint8Array` of raw Parquet bytes or a URL string
 *   (Node/Bun compatible `fetch` must be available for URL sources).
 * @param options - Optional read options.
 * @returns A `DataFrame` built from the decoded data.
 */
export async function readParquet(
  source: Uint8Array | string,
  options: ReadParquetOptions = {},
): Promise<DataFrame> {
  // Resolve bytes
  let bytes: Uint8Array;
  if (typeof source === "string") {
    const resp = await fetch(source);
    if (!resp.ok) {
      throw new TypeError(`readParquet: HTTP ${resp.status} fetching '${source}'`);
    }
    bytes = new Uint8Array(await resp.arrayBuffer());
  } else {
    bytes = source;
  }

  // Delegate to injected WASM decoder if present
  type ParquetDecoder = {
    decode(
      buf: Uint8Array,
      opts?: { columns?: readonly string[]; nrows?: number },
    ): Record<string, unknown>[];
  };
  const decoder = (globalThis as Record<string, unknown>)["__parquetDecoder"] as
    | ParquetDecoder
    | undefined;
  if (decoder !== undefined) {
    const rows = decoder.decode(bytes, {
      ...(options.columns !== undefined && { columns: options.columns }),
      ...(options.nrows !== undefined && { nrows: options.nrows }),
    });
    return DataFrame.fromRecords(rows as Record<string, import("../types.ts").Scalar>[], {});
  }

  throw new TypeError(
    "readParquet: no Parquet decoder available.\n" +
      "Set `globalThis.__parquetDecoder` to a compatible WASM decoder " +
      "(e.g. parquet-wasm) to enable Parquet support.",
  );
}
