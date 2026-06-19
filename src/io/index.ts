/**
 * tsb/io — I/O utilities.
 *
 * @module
 */

export { readCsv, toCsv } from "./csv.ts";
export type { ReadCsvOptions, ToCsvOptions } from "./csv.ts";
export { readJson, toJson } from "./json.ts";
export type { ReadJsonOptions, ToJsonOptions, JsonOrient } from "./json.ts";
export { jsonNormalize } from "./json_normalize.ts";
export type { JsonPath, JsonNormalizeOptions } from "./json_normalize.ts";
export {
  toJsonDenormalize,
  toJsonRecords,
  toJsonSplit,
  toJsonIndex,
} from "./to_json_normalize.ts";
export type {
  JsonDenormalizeOptions,
  JsonSplitOptions,
  JsonSplitResult,
} from "./to_json_normalize.ts";
export { readHtml } from "./read_html.ts";
export type { ReadHtmlOptions } from "./read_html.ts";
export { readXml, toXml } from "./xml.ts";
export type { ReadXmlOptions, ToXmlOptions } from "./xml.ts";
export { readTable } from "./read_table.ts";
export type { ReadTableOptions } from "./read_table.ts";

export { readSql, readSqlQuery, readSqlTable, toSql } from "./sql.ts";
export { TableExistsError, TableNotFoundError } from "./sql.ts";

export { readStata, toStata } from "./stata.ts";
export type { ReadStataOptions, ToStataOptions } from "./stata.ts";
export { readParquet, toParquet } from "./parquet.ts";
export type { ReadParquetOptions, ToParquetOptions } from "./parquet.ts";
export { readFwf } from "./fwf.ts";
export type { ReadFwfOptions, ColSpec } from "./fwf.ts";
export type {
  SqlValue,
  SqlRow,
  SqlResult,
  SqlConnection,
  IfExistsStrategy,
  ReadSqlBaseOptions,
  ReadSqlQueryOptions,
  ReadSqlTableOptions,
  ReadSqlOptions,
  ToSqlOptions,
} from "./sql.ts";

// readExcel / xlsxSheetNames use node:zlib and cannot be bundled for the
// browser.  Import them directly from "tsb/io/read_excel" when running in
// Node / Bun.
