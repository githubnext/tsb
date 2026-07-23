/**
 * Benchmark: readSqlQuery / toSql on 10k-row result sets
 */
import { DataFrame, readSqlQuery, toSql } from "../../src/index.js";
import type { SqlConnection, SqlResult, SqlRow, SqlValue, IfExistsStrategy } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

// ── Shared result set ─────────────────────────────────────────────────────────
const columns: string[] = ["id", "value", "label"];
const rows: SqlRow[] = Array.from({ length: ROWS }, (_, i) => ({
  id: i,
  value: Math.sin(i * 0.01) * 1000,
  label: `item_${i % 100}`,
}));

// ── Mock adapter for reads ────────────────────────────────────────────────────
class ReadAdapter implements SqlConnection {
  query(_sql: string, _params?: readonly SqlValue[]): SqlResult {
    return { columns, rows };
  }
  listTables(): readonly string[] {
    return ["mock_table"];
  }
}

const readConn = new ReadAdapter();

// ── Warm-up reads ─────────────────────────────────────────────────────────────
for (let i = 0; i < WARMUP; i++) {
  readSqlQuery("SELECT * FROM mock_table", readConn);
}

// ── readSqlQuery benchmark ────────────────────────────────────────────────────
const startRead = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readSqlQuery("SELECT * FROM mock_table", readConn);
}
const totalRead = performance.now() - startRead;

// ── Mock adapter for writes ───────────────────────────────────────────────────
class WriteAdapter implements SqlConnection {
  query(_sql: string, _params?: readonly SqlValue[]): SqlResult {
    return { columns: [], rows: [] };
  }
  listTables(): readonly string[] {
    return [];
  }
  insert(
    _tableName: string,
    _rows: readonly SqlRow[],
    _columns: readonly string[],
    _ifExists: IfExistsStrategy,
  ): number {
    return _rows.length;
  }
}

const writeConn = new WriteAdapter();
const df = readSqlQuery("SELECT * FROM mock_table", readConn);

// ── Warm-up writes ────────────────────────────────────────────────────────────
for (let i = 0; i < WARMUP; i++) {
  toSql(df, "bench_table", writeConn, { ifExists: "replace" });
}

// ── toSql benchmark ───────────────────────────────────────────────────────────
const startWrite = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toSql(df, "bench_table", writeConn, { ifExists: "replace" });
}
const totalWrite = performance.now() - startWrite;

console.log(
  JSON.stringify({
    function: "sql",
    mean_ms: (totalRead + totalWrite) / (2 * ITERATIONS),
    iterations: ITERATIONS,
    total_ms: totalRead + totalWrite,
    read_mean_ms: totalRead / ITERATIONS,
    write_mean_ms: totalWrite / ITERATIONS,
  }),
);
