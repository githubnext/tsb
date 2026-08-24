/**
 * Benchmark: readSql — auto-dispatching SQL read (query vs table).
 *
 * `readSql` inspects the first argument: if it looks like a SQL query it
 * calls `readSqlQuery`; otherwise it calls `readSqlTable`. This benchmark
 * exercises both dispatch paths and measures the combined overhead.
 *
 * Dataset: 10 000-row mock adapter (3 columns).
 * Outputs JSON: {"function": "read_sql", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { readSql } from "../../src/index.js";
import type { SqlConnection, SqlResult, SqlRow, SqlValue } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

const columns: string[] = ["id", "value", "label"];
const rows: SqlRow[] = Array.from({ length: ROWS }, (_, i) => ({
  id: i,
  value: Math.round(Math.random() * 1000),
  label: `item_${i % 200}`,
}));

class MockConn implements SqlConnection {
  query(_sql: string, _params?: readonly SqlValue[]): SqlResult {
    return { columns, rows };
  }
  listTables(): readonly string[] {
    return ["sensors"];
  }
}

const conn = new MockConn();

// Two inputs: one that looks like a query, one that looks like a table name.
const SQL_QUERY = "SELECT * FROM sensors";
const TABLE_NAME = "sensors";

function run(): void {
  // Query dispatch path
  const df1 = readSql(SQL_QUERY, conn);
  // Table dispatch path
  const df2 = readSql(TABLE_NAME, conn);
  void df1.shape;
  void df2.shape;
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "read_sql",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
