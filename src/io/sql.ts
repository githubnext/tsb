/**
 * read_sql / to_sql — SQL I/O for DataFrame.
 *
 * Mirrors the pandas SQL I/O API:
 * - {@link readSqlQuery} — execute a SQL SELECT and return a DataFrame
 * - {@link readSqlTable} — read an entire table into a DataFrame
 * - {@link readSql} — auto-detect query vs table name
 * - {@link toSql} — write a DataFrame to a SQL table
 *
 * Because tsb has zero runtime dependencies, this module does **not** ship a
 * database driver.  Instead it defines the {@link SqlConnection} adapter
 * interface.  Pass a conforming adapter for your driver of choice
 * (better-sqlite3, postgres, mysql2, …) to any of the functions here.
 *
 * @example
 * ```ts
 * import type { SqlConnection, SqlResult, SqlValue } from "tsb";
 * import { readSql, toSql } from "tsb";
 *
 * // Minimal in-memory adapter (illustrative — not a real DB)
 * class MockAdapter implements SqlConnection {
 *   query(sql: string): SqlResult {
 *     return { columns: ["id", "name"], rows: [{ id: 1, name: "Alice" }] };
 *   }
 * }
 *
 * const db = new MockAdapter();
 * const df = readSql("SELECT * FROM users", db);
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── SQL value types ──────────────────────────────────────────────────────────

/**
 * A scalar value that may be returned from a SQL query column.
 *
 * Covers the common ground across DB drivers: numbers, strings, booleans,
 * `null` (SQL NULL), and raw byte buffers (SQL BLOB / BYTEA).
 */
export type SqlValue = string | number | boolean | null | Uint8Array;

/**
 * A single row from a SQL result set, mapping column name → value.
 */
export type SqlRow = Record<string, SqlValue>;

/**
 * The complete result of executing a SQL query.
 */
export interface SqlResult {
  /** Ordered list of column names as returned by the database. */
  readonly columns: readonly string[];
  /** All data rows. Each row is an object keyed by column name. */
  readonly rows: readonly SqlRow[];
}

// ─── connection adapter interface ─────────────────────────────────────────────

/**
 * Strategy for handling a pre-existing table in {@link toSql}.
 *
 * - `"fail"` — throw {@link TableExistsError} if the table already exists (default).
 * - `"replace"` — drop and recreate the table, then insert all rows.
 * - `"append"` — insert rows into the existing table without dropping it.
 */
export type IfExistsStrategy = "fail" | "replace" | "append";

/**
 * Adapter interface for a SQL database connection.
 *
 * Implement this interface for your specific database driver and pass instances
 * to {@link readSql}, {@link readSqlQuery}, {@link readSqlTable}, and
 * {@link toSql}.
 *
 * Only {@link query} is required; all other methods are optional and enable
 * more efficient or richer behaviour.
 *
 * @example
 * ```ts
 * // Minimal adapter wrapping better-sqlite3
 * import Database from "better-sqlite3";
 * import type { SqlConnection, SqlResult } from "tsb";
 *
 * class BetterSqlite3Adapter implements SqlConnection {
 *   constructor(private readonly db: Database.Database) {}
 *
 *   query(sql: string, params?: readonly SqlValue[]): SqlResult {
 *     const stmt = this.db.prepare(sql);
 *     const rows = stmt.all(...(params ?? [])) as SqlRow[];
 *     const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];
 *     return { columns, rows };
 *   }
 *
 *   listTables(): string[] {
 *     return (this.db.prepare(
 *       "SELECT name FROM sqlite_master WHERE type='table'",
 *     ).all() as { name: string }[]).map((r) => r.name);
 *   }
 * }
 * ```
 */
export interface SqlConnection {
  /**
   * Execute a SQL query and return the result set.
   *
   * @param sql    SQL string, which may include `?` (positional) or `$N`
   *               (numbered) placeholders — semantics depend on the driver.
   * @param params Optional positional parameters bound to the placeholders.
   */
  query(sql: string, params?: readonly SqlValue[]): SqlResult;

  /**
   * Return the names of all tables visible through this connection.
   *
   * Used by {@link readSqlTable} to validate that the requested table exists.
   * When omitted, no up-front validation is performed.
   */
  listTables?(): readonly string[];

  /**
   * Insert rows into a table, applying the specified {@link IfExistsStrategy}.
   *
   * When provided, {@link toSql} delegates bulk insertion to this method,
   * allowing the adapter to use database-native batch APIs.
   * When omitted, {@link toSql} falls back to individual `INSERT INTO …`
   * statements executed via {@link query}.
   *
   * @param tableName Target table.
   * @param rows      Row objects — each key is a column name.
   * @param columns   Ordered column names (matches keys in `rows`).
   * @param ifExists  How to handle a pre-existing table.
   * @returns Number of rows inserted.
   */
  insert?(
    tableName: string,
    rows: readonly SqlRow[],
    columns: readonly string[],
    ifExists: IfExistsStrategy,
  ): number;
}

// ─── public option types ──────────────────────────────────────────────────────

/**
 * Options shared by all read functions.
 */
export interface ReadSqlBaseOptions {
  /**
   * Column name or zero-based position to use as the DataFrame row index.
   * When a string is given the column must exist in the result.
   * When a number is given it selects by position.
   * Default: `null` — a default `RangeIndex` is used.
   */
  readonly indexCol?: string | number | null;

  /**
   * Column names to parse as timestamps.
   * Values are converted to milliseconds-since-epoch using `Date.parse()`.
   * Non-parseable values are left as-is.
   */
  readonly parseDates?: readonly string[];
}

/**
 * Options for {@link readSqlQuery}.
 */
export interface ReadSqlQueryOptions extends ReadSqlBaseOptions {
  /**
   * Positional parameter bindings for the SQL query.
   * Passed verbatim to {@link SqlConnection.query}.
   */
  readonly params?: readonly SqlValue[];
}

/**
 * Options for {@link readSqlTable}.
 */
export interface ReadSqlTableOptions extends ReadSqlBaseOptions {
  /**
   * Schema qualifier to prefix the table name (e.g. `"public"` in PostgreSQL).
   * When provided the query uses `"<schema>"."<table>"`.
   */
  readonly schema?: string;

  /**
   * Subset of columns to retrieve.  When omitted all columns are returned.
   */
  readonly columns?: readonly string[];
}

/**
 * Options for {@link readSql}.
 * Combines {@link ReadSqlQueryOptions} and {@link ReadSqlTableOptions}.
 */
export interface ReadSqlOptions extends ReadSqlQueryOptions, ReadSqlTableOptions {}

/**
 * Options for {@link toSql}.
 */
export interface ToSqlOptions {
  /**
   * Behaviour when a table named `name` already exists.
   * Default: `"fail"`.
   */
  readonly ifExists?: IfExistsStrategy;

  /**
   * Whether to write the DataFrame's row index as a column.
   * Default: `true`.
   */
  readonly index?: boolean;

  /**
   * Column label to use for the written index column.
   * Only effective when `index` is `true`.
   * Default: the index name when set, otherwise `"index"`.
   */
  readonly indexLabel?: string | null;

  /**
   * Number of rows to insert per batch.
   * Ignored when the adapter provides {@link SqlConnection.insert}.
   * Default: all rows in a single batch.
   */
  readonly chunksize?: number;
}

// ─── errors ───────────────────────────────────────────────────────────────────

/**
 * Thrown by {@link toSql} when `ifExists: "fail"` (the default) and the
 * target table already exists.
 */
export class TableExistsError extends Error {
  /** @param tableName The table that already exists. */
  constructor(tableName: string) {
    super(`Table "${tableName}" already exists. Use ifExists: "replace" or "append".`);
    this.name = "TableExistsError";
  }
}

/**
 * Thrown by {@link readSqlTable} when the requested table is not found.
 */
export class TableNotFoundError extends Error {
  /** @param tableName The table that was not found. */
  constructor(tableName: string) {
    super(`Table "${tableName}" not found in the database.`);
    this.name = "TableNotFoundError";
  }
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Convert a {@link SqlValue} to a tsb {@link Scalar}. */
function sqlValueToScalar(v: SqlValue): Scalar {
  if (v instanceof Uint8Array) {
    // Represent BLOB as a JSON string of the hex encoding so it can sit in a
    // string-typed Series without losing data.
    return Buffer.from(v).toString("hex");
  }
  return v;
}

/**
 * Build a DataFrame from a {@link SqlResult}, applying common options.
 *
 * @internal
 */
function resultToDataFrame(result: SqlResult, options: ReadSqlBaseOptions): DataFrame {
  const { indexCol = null, parseDates } = options;

  // Resolve the index column name (if any).
  let idxColName: string | null = null;
  if (indexCol !== null && indexCol !== undefined) {
    if (typeof indexCol === "number") {
      const col = result.columns[indexCol];
      if (col !== undefined) {
        idxColName = col;
      }
    } else {
      idxColName = indexCol;
    }
  }

  // Build column arrays, excluding the index column.
  const dataColumns: string[] = [];
  const columnData: Record<string, Scalar[]> = {};

  for (const col of result.columns) {
    if (col === idxColName) {
      continue;
    }
    dataColumns.push(col);
    columnData[col] = [];
  }

  // Populate column arrays.
  for (const row of result.rows) {
    for (const col of dataColumns) {
      const arr = columnData[col];
      if (arr !== undefined) {
        const raw = row[col];
        arr.push(raw !== undefined ? sqlValueToScalar(raw) : null);
      }
    }
  }

  // Parse date columns (convert to ms-since-epoch numbers).
  if (parseDates !== undefined) {
    for (const col of parseDates) {
      const arr = columnData[col];
      if (arr !== undefined) {
        for (let i = 0; i < arr.length; i++) {
          const v = arr[i];
          if (v !== null && v !== undefined && typeof v === "string") {
            const ms = Date.parse(v);
            arr[i] = Number.isNaN(ms) ? v : ms;
          }
        }
      }
    }
  }

  // Build the row index.
  const indexVals: Label[] = [];
  if (idxColName !== null) {
    for (const row of result.rows) {
      const raw = row[idxColName];
      const v: SqlValue = raw !== undefined ? raw : null;
      if (v instanceof Uint8Array) {
        indexVals.push(Buffer.from(v).toString("hex"));
      } else {
        indexVals.push(v);
      }
    }
  }

  const rowIndex = idxColName !== null ? new Index(indexVals, idxColName) : undefined;

  return DataFrame.fromColumns(
    columnData as Record<string, readonly Scalar[]>,
    rowIndex !== undefined ? { index: rowIndex } : {},
  );
}

/** Quote an identifier with double-quotes (ANSI SQL). */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Build a SELECT statement for {@link readSqlTable}. */
function buildSelectQuery(tableName: string, options: ReadSqlTableOptions): string {
  const { schema, columns } = options;

  const qualifiedTable =
    schema !== undefined ? `${quoteIdent(schema)}.${quoteIdent(tableName)}` : quoteIdent(tableName);

  const colList =
    columns !== undefined && columns.length > 0 ? columns.map(quoteIdent).join(", ") : "*";

  return `SELECT ${colList} FROM ${qualifiedTable}`;
}

/**
 * Heuristic: does the string look like a SQL query (contains whitespace) or a
 * plain table name?
 */
function looksLikeQuery(sqlOrTable: string): boolean {
  return /\s/.test(sqlOrTable.trim());
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Execute a SQL SELECT query and return the result as a {@link DataFrame}.
 *
 * Mirrors `pandas.read_sql_query()`.
 *
 * ```ts
 * import { readSqlQuery } from "tsb";
 *
 * const df = readSqlQuery("SELECT id, name FROM users WHERE active = ?", db, {
 *   params: [1],
 *   indexCol: "id",
 * });
 * ```
 *
 * @param sql     SQL SELECT string (may include parameter placeholders).
 * @param conn    Database adapter implementing {@link SqlConnection}.
 * @param options See {@link ReadSqlQueryOptions}.
 */
export function readSqlQuery(
  sql: string,
  conn: SqlConnection,
  options: ReadSqlQueryOptions = {},
): DataFrame {
  const { params } = options;
  const result = params !== undefined ? conn.query(sql, params) : conn.query(sql);
  return resultToDataFrame(result, options);
}

/**
 * Read an entire database table into a {@link DataFrame}.
 *
 * Mirrors `pandas.read_sql_table()`.
 *
 * ```ts
 * import { readSqlTable } from "tsb";
 *
 * const df = readSqlTable("products", db, {
 *   schema: "inventory",
 *   columns: ["id", "name", "price"],
 * });
 * ```
 *
 * @param tableName Name of the table to read.
 * @param conn      Database adapter implementing {@link SqlConnection}.
 * @param options   See {@link ReadSqlTableOptions}.
 */
export function readSqlTable(
  tableName: string,
  conn: SqlConnection,
  options: ReadSqlTableOptions = {},
): DataFrame {
  if (conn.listTables !== undefined) {
    const tables = conn.listTables();
    const tableNameLower = tableName.toLowerCase();
    const found = tables.some((t) => t.toLowerCase() === tableNameLower);
    if (!found) {
      throw new TableNotFoundError(tableName);
    }
  }

  const sql = buildSelectQuery(tableName, options);
  const result = conn.query(sql);
  return resultToDataFrame(result, options);
}

/**
 * Read a SQL query **or** table name into a {@link DataFrame}.
 *
 * Mirrors `pandas.read_sql()`.
 *
 * - If `sqlOrTable` contains whitespace it is treated as a SQL query string
 *   and executed via {@link readSqlQuery}.
 * - Otherwise it is treated as a table name and delegated to
 *   {@link readSqlTable}.
 *
 * ```ts
 * import { readSql } from "tsb";
 *
 * // Using a query
 * const df1 = readSql("SELECT * FROM orders WHERE status = 'open'", db);
 *
 * // Using a table name
 * const df2 = readSql("orders", db);
 * ```
 *
 * @param sqlOrTable SQL query string or bare table name.
 * @param conn       Database adapter implementing {@link SqlConnection}.
 * @param options    See {@link ReadSqlOptions}.
 */
export function readSql(
  sqlOrTable: string,
  conn: SqlConnection,
  options: ReadSqlOptions = {},
): DataFrame {
  if (looksLikeQuery(sqlOrTable)) {
    return readSqlQuery(sqlOrTable, conn, options);
  }
  return readSqlTable(sqlOrTable, conn, options);
}

/**
 * Write a {@link DataFrame} to a SQL table.
 *
 * Mirrors `pandas.DataFrame.to_sql()`.
 *
 * When the adapter provides an {@link SqlConnection.insert} method, writes are
 * delegated to it (enabling driver-native batching).  Otherwise each row is
 * written via an individual `INSERT INTO` statement through
 * {@link SqlConnection.query}.
 *
 * ```ts
 * import { toSql } from "tsb";
 *
 * const rowsWritten = toSql(df, "staging_data", db, { ifExists: "replace" });
 * ```
 *
 * @param df        Source DataFrame.
 * @param tableName Destination table name.
 * @param conn      Database adapter implementing {@link SqlConnection}.
 * @param options   See {@link ToSqlOptions}.
 * @returns Number of rows written.
 */
export function toSql(
  df: DataFrame,
  tableName: string,
  conn: SqlConnection,
  options: ToSqlOptions = {},
): number {
  const { ifExists = "fail", index = true, indexLabel = null, chunksize } = options;

  // Build ordered column list.
  const dataCols = [...df.columns.values] as string[];
  const allCols: string[] = [];
  let idxLabel = "index";
  if (index) {
    const nameFromIndex = df.index.name;
    if (indexLabel !== null && indexLabel !== undefined) {
      idxLabel = indexLabel;
    } else if (typeof nameFromIndex === "string" && nameFromIndex.length > 0) {
      idxLabel = nameFromIndex;
    }
    allCols.push(idxLabel);
  }
  for (const c of dataCols) {
    allCols.push(c);
  }

  // Build row objects.
  const records = df.toRecords();
  const indexValues = [...df.index.values] as Label[];
  const rows: SqlRow[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const row: SqlRow = {};
    if (index) {
      const idxVal = indexValues[i];
      row[idxLabel] = labelToSqlValue(idxVal !== undefined ? idxVal : null);
    }
    if (rec !== undefined) {
      for (const col of dataCols) {
        const v = rec[col];
        row[col] = scalarToSqlValue(v !== undefined ? v : null);
      }
    }
    rows.push(row);
  }

  if (conn.insert !== undefined) {
    return conn.insert(tableName, rows, allCols, ifExists);
  }

  // Fallback: emit INSERT statements via query().
  return insertViaQuery(tableName, rows, allCols, ifExists, chunksize, conn);
}

// ─── helpers for toSql ────────────────────────────────────────────────────────

/** Convert a {@link Label} to a {@link SqlValue}. */
function labelToSqlValue(label: Label): SqlValue {
  if (label === null) {
    return null;
  }
  if (typeof label === "boolean") {
    return label;
  }
  if (typeof label === "number") {
    return label;
  }
  if (typeof label === "string") {
    return label;
  }
  if (label instanceof Date) {
    return label.toISOString();
  }
  return String(label);
}

/** Convert a tsb {@link Scalar} to a {@link SqlValue}. */
function scalarToSqlValue(s: Scalar): SqlValue {
  if (s === null || s === undefined) {
    return null;
  }
  if (typeof s === "boolean") {
    return s;
  }
  if (typeof s === "number") {
    return s;
  }
  if (typeof s === "string") {
    return s;
  }
  if (typeof s === "bigint") {
    return Number(s);
  }
  if (s instanceof Date) {
    return s.toISOString();
  }
  // TimedeltaLike — store as total milliseconds
  if (typeof s === "object" && "totalMs" in s) {
    return s.totalMs;
  }
  return null;
}

/**
 * Escape a string for inclusion in a SQL literal.
 * Only used in the fallback query path.
 */
function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''");
}

/** Format a {@link SqlValue} as a SQL literal for the fallback path. */
function sqlLiteral(v: SqlValue): string {
  if (v === null) {
    return "NULL";
  }
  if (typeof v === "boolean") {
    return v ? "1" : "0";
  }
  if (typeof v === "number") {
    if (Number.isNaN(v)) {
      return "NULL";
    }
    if (!Number.isFinite(v)) {
      return "NULL";
    }
    return String(v);
  }
  if (typeof v === "string") {
    return `'${escapeSqlString(v)}'`;
  }
  // Uint8Array (blob): represent as hex literal (SQLite: X'…')
  return `X'${Buffer.from(v).toString("hex")}'`;
}

/**
 * Insert rows by emitting individual INSERT statements through
 * {@link SqlConnection.query}.  Falls back for adapters that don't implement
 * {@link SqlConnection.insert}.
 */
function insertViaQuery(
  tableName: string,
  rows: readonly SqlRow[],
  columns: readonly string[],
  ifExists: IfExistsStrategy,
  chunksize: number | undefined,
  conn: SqlConnection,
): number {
  if (rows.length === 0) {
    return 0;
  }

  const quotedTable = quoteIdent(tableName);
  const colList = columns.map(quoteIdent).join(", ");

  // Check for pre-existing table when strategy is "fail".
  if (ifExists === "fail" && conn.listTables !== undefined) {
    const tables = conn.listTables();
    const tl = tableName.toLowerCase();
    if (tables.some((t) => t.toLowerCase() === tl)) {
      throw new TableExistsError(tableName);
    }
  }

  // "replace": attempt DROP TABLE first.
  if (ifExists === "replace") {
    try {
      conn.query(`DROP TABLE IF EXISTS ${quotedTable}`);
    } catch {
      // Some minimal adapters may not support DDL via query().
    }
  }

  const batchSize = chunksize !== undefined && chunksize > 0 ? chunksize : rows.length;
  let written = 0;

  for (let start = 0; start < rows.length; start += batchSize) {
    const end = Math.min(start + batchSize, rows.length);

    for (let i = start; i < end; i++) {
      const row = rows[i];
      if (row === undefined) {
        continue;
      }
      const valList = columns.map((col) => sqlLiteral(row[col] ?? null)).join(", ");
      conn.query(`INSERT INTO ${quotedTable} (${colList}) VALUES (${valList})`);
      written += 1;
    }
  }

  return written;
}
