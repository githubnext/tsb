/**
 * read_excel — Excel file reader stub.
 *
 * A minimal stub that reads Excel (.xlsx / .xls) files by delegating to a
 * compatible decoder when available.  Full implementation requires a WASM or
 * pure-JS XLSX library to be vendored.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

/** Options for `readExcel`. */
export interface ReadExcelOptions {
  /** Sheet name or 0-based index to read. Defaults to the first sheet (0). */
  sheetName?: string | number;
  /** Row index to use as column names (0-based). Defaults to 0. */
  header?: number;
  /** Number of rows to skip before reading data (default 0). */
  skiprows?: number;
  /** Number of data rows to parse. If omitted, all rows are parsed. */
  nrows?: number;
  /** Columns to include. If omitted, all columns are included. */
  usecols?: readonly string[] | readonly number[];
}

/**
 * Read an Excel file and return a DataFrame.
 *
 * **Status**: stub — full Excel decoding requires a WASM or pure-JS XLSX
 * decoder injected via `globalThis.__excelDecoder`.
 *
 * @param source - A `Uint8Array` of raw Excel bytes or a URL string.
 * @param options - Optional read options.
 * @returns A `DataFrame` built from the decoded sheet data.
 */
export async function readExcel(
  source: Uint8Array | string,
  options: ReadExcelOptions = {},
): Promise<DataFrame> {
  // Resolve bytes
  let bytes: Uint8Array;
  if (typeof source === "string") {
    const resp = await fetch(source);
    if (!resp.ok) {
      throw new TypeError(`readExcel: HTTP ${resp.status} fetching '${source}'`);
    }
    bytes = new Uint8Array(await resp.arrayBuffer());
  } else {
    bytes = source;
  }

  type ExcelDecoder = {
    decode(
      buf: Uint8Array,
      opts?: {
        sheetName?: string | number;
        header?: number;
        skiprows?: number;
        nrows?: number;
        usecols?: readonly string[] | readonly number[];
      },
    ): Record<string, Scalar>[];
  };

  const decoder = (globalThis as Record<string, unknown>)["__excelDecoder"] as
    | ExcelDecoder
    | undefined;
  if (decoder !== undefined) {
    const rows = decoder.decode(bytes, options);
    return DataFrame.fromRecords(rows, {});
  }

  throw new TypeError(
    "readExcel: no Excel decoder available.\n" +
      "Set `globalThis.__excelDecoder` to a compatible decoder " +
      "(e.g. SheetJS / xlsx) to enable Excel support.",
  );
}
