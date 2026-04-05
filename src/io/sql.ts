/**
 * SQL I/O — read and write DataFrames via a database connection.
 *
 * Mirrors `pandas.read_sql` and `DataFrame.to_sql`: execute queries through
 * a minimal `SqlConnection` interface, returning DataFrames from results and
 * writing DataFrames as rows into SQL tables.
 *
 * @example
 * ```ts
 * import { readSql, toSql } from "tsb";
 *
 * const conn: SqlConnection = { query: async (sql) => db.all(sql) };
 * const df = await readSql("SELECT * FROM users", conn);
 * await toSql(df, "users_backup", conn, { ifExists: "replace" });
 * ```
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Minimal database connection interface for SQL I/O.
 *
 * Implement this with any database client (e.g., postgres, sqlite3, mysql2).
 */
export interface SqlConnection {
  /** Execute a SQL query and return rows as plain objects. */
  query(sql: string, params?: readonly unknown[]): Promise<readonly Record<string, unknown>[]>;
}

/** Options for {@link readSql}. */
export interface ReadSqlOptions {
  /** Parameter values to bind to the query. */
  params?: readonly unknown[];
  /** Parse datetime strings into Date objects. Default: true */
  parseDates?: boolean;
  /** Column name to use as the DataFrame index. */
  indexCol?: string;
}

/** Options for {@link toSql}. */
export interface ToSqlOptions {
  /** What to do if the table already exists: "fail" | "replace" | "append". Default: "fail" */
  ifExists?: "fail" | "replace" | "append";
  /** Write the row index as a column. Default: false */
  index?: boolean;
  /** Name to give the index column if index=true. Default: "index" */
  indexLabel?: string;
  /** Insert in chunks of this size. Default: 1000 */
  chunksize?: number;
}

// ─── top-level regex constants ────────────────────────────────────────────────

/** Detects ISO 8601-like datetime strings. */
const RE_DATE_STRING =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Try to parse a value as a Date; return the original value on failure. */
function maybeParseDateValue(v: unknown): unknown {
  if (typeof v !== "string") {
    return v;
  }
  if (!RE_DATE_STRING.test(v)) {
    return v;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d;
}

/** Convert an unknown row value to a Scalar. */
function toScalar(v: unknown): Scalar {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
    return v;
  }
  if (v instanceof Date) {
    return v;
  }
  if (typeof v === "bigint") {
    return Number(v);
  }
  return String(v);
}

/** Apply date parsing to all string values in a row. */
function parseDatesInRow(row: Record<string, unknown>): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    parsed[k] = maybeParseDateValue(v);
  }
  return parsed;
}

/** Convert raw database rows to Scalar records. */
function rowsToScalarRecords(
  rows: readonly Record<string, unknown>[],
  parseDates: boolean,
): Record<string, Scalar>[] {
  return rows.map((row) => {
    const processed = parseDates ? parseDatesInRow(row) : row;
    const record: Record<string, Scalar> = {};
    for (const [k, v] of Object.entries(processed)) {
      record[k] = toScalar(v);
    }
    return record;
  });
}

/** Escape a SQL identifier by wrapping in double quotes. */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Build a SQL VALUES placeholder string for `n` columns. */
function buildPlaceholders(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ");
}

/** Build CREATE TABLE SQL from column names and sample row. */
function buildCreateSql(table: string, colNames: string[]): string {
  const cols = colNames.map((c) => `${quoteIdent(c)} TEXT`).join(", ");
  return `CREATE TABLE IF NOT EXISTS ${quoteIdent(table)} (${cols})`;
}

/** Check if a table exists via a query. */
async function tableExists(conn: SqlConnection, table: string): Promise<boolean> {
  try {
    const rows = await conn.query(`SELECT 1 FROM ${quoteIdent(table)} WHERE 1=0`);
    return rows !== undefined;
  } catch {
    return false;
  }
}

/** Insert rows in chunks. */
async function insertChunks(
  conn: SqlConnection,
  table: string,
  colNames: string[],
  rows: readonly unknown[][],
  chunksize: number,
): Promise<void> {
  const quotedCols = colNames.map(quoteIdent).join(", ");
  const placeholders = buildPlaceholders(colNames.length);
  const insertSql = `INSERT INTO ${quoteIdent(table)} (${quotedCols}) VALUES (${placeholders})`;

  for (let start = 0; start < rows.length; start += chunksize) {
    const chunk = rows.slice(start, start + chunksize);
    for (const row of chunk) {
      await conn.query(insertSql, row as readonly unknown[]);
    }
  }
}

// ─── readSql ─────────────────────────────────────────────────────────────────

/**
 * Execute a SQL query and return the results as a DataFrame.
 *
 * @param query   - SQL query string.
 * @param conn    - Database connection implementing {@link SqlConnection}.
 * @param options - Query options.
 * @returns A DataFrame with one column per result column.
 *
 * @example
 * ```ts
 * const df = await readSql("SELECT id, name FROM users", conn);
 * df.col("name").values; // ["Alice", "Bob"]
 * ```
 */
export async function readSql(
  query: string,
  conn: SqlConnection,
  options?: ReadSqlOptions,
): Promise<DataFrame> {
  const parseDates = options?.parseDates ?? true;
  const params = options?.params;
  const indexCol = options?.indexCol;

  const rawRows = await conn.query(query, params);
  if (rawRows.length === 0) {
    return DataFrame.fromColumns({});
  }

  const scalarRows = rowsToScalarRecords(rawRows, parseDates);

  if (indexCol !== undefined) {
    const indexVals: Scalar[] = scalarRows.map((r) => r[indexCol] ?? null);
    const dataRows = scalarRows.map((r) => {
      const row: Record<string, Scalar> = {};
      for (const [k, v] of Object.entries(r)) {
        if (k !== indexCol) {
          row[k] = v;
        }
      }
      return row;
    });
    const indexStrings = indexVals.map((v) => (v === null || v === undefined ? "" : String(v)));
    return DataFrame.fromRecords(dataRows, { index: indexStrings });
  }

  return DataFrame.fromRecords(scalarRows);
}

// ─── toSql ───────────────────────────────────────────────────────────────────

/** Prepare the table (drop/create) based on ifExists policy. */
async function prepareTable(
  conn: SqlConnection,
  table: string,
  colNames: string[],
  ifExists: "fail" | "replace" | "append",
): Promise<void> {
  if (ifExists === "fail") {
    const exists = await tableExists(conn, table);
    if (exists) {
      throw new Error(`toSql: table "${table}" already exists`);
    }
  } else if (ifExists === "replace") {
    await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(table)}`);
  }
  if (ifExists !== "append") {
    await conn.query(buildCreateSql(table, colNames));
  }
}

/** Build row arrays from a DataFrame. */
function buildRows(df: DataFrame, dataCols: string[], writeIndex: boolean): unknown[][] {
  const nRows = df.index.size;
  const indexVals = writeIndex ? df.index.values : null;
  const colSeries = dataCols.map((c) => df.col(c).values);
  const rows: unknown[][] = [];
  for (let i = 0; i < nRows; i++) {
    const row: unknown[] = [];
    if (indexVals !== null) {
      row.push(indexVals[i] ?? null);
    }
    for (const colVals of colSeries) {
      row.push(colVals[i] ?? null);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Write a DataFrame to a SQL table.
 *
 * @param df      - The DataFrame to write.
 * @param table   - Target table name.
 * @param conn    - Database connection implementing {@link SqlConnection}.
 * @param options - Write options.
 *
 * @example
 * ```ts
 * await toSql(df, "my_table", conn, { ifExists: "replace" });
 * ```
 */
export async function toSql(
  df: DataFrame,
  table: string,
  conn: SqlConnection,
  options?: ToSqlOptions,
): Promise<void> {
  const ifExists = options?.ifExists ?? "fail";
  const writeIndex = options?.index ?? false;
  const indexLabel = options?.indexLabel ?? "index";
  const chunksize = options?.chunksize ?? 1000;

  const dataCols = [...df.columns.values];
  const colNames = writeIndex ? [indexLabel, ...dataCols] : dataCols;

  await prepareTable(conn, table, colNames, ifExists);
  const rows = buildRows(df, dataCols, writeIndex);
  await insertChunks(conn, table, colNames, rows, chunksize);
}
