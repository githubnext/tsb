/**
 * Benchmark: readSqlTable — read an entire named table into a DataFrame.
 *
 * Uses a mock SqlConnection adapter that returns a 10k-row, 3-column result set.
 * Covers the `readSqlTable` path (table-name validation via `listTables()` +
 * `SELECT * FROM <table>` query dispatch).
 *
 * Outputs JSON: {"function": "read_sql_table", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { readSqlTable } from "../../src/index.js";
import type { SqlConnection, SqlResult, SqlRow, SqlValue } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

// ── Shared result set ─────────────────────────────────────────────────────────
const columns: string[] = ["id", "score", "category"];
const rows: SqlRow[] = Array.from({ length: ROWS }, (_, i) => ({
  id: i,
  score: Math.sin(i * 0.01) * 100,
  category: `cat_${i % 50}`,
}));

// ── Mock adapter ──────────────────────────────────────────────────────────────
class TableAdapter implements SqlConnection {
  query(_sql: string, _params?: readonly SqlValue[]): SqlResult {
    return { columns, rows };
  }
  listTables(): readonly string[] {
    return ["sensors", "events", "logs"];
  }
}

const conn = new TableAdapter();

// ── Warm-up ───────────────────────────────────────────────────────────────────
for (let i = 0; i < WARMUP; i++) {
  readSqlTable("sensors", conn);
}

// ── Benchmark ────────────────────────────────────────────────────────────────
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readSqlTable("sensors", conn);
}
const total_ms = performance.now() - start;
const mean_ms = total_ms / ITERATIONS;

console.log(
  JSON.stringify({
    function: "read_sql_table",
    mean_ms: parseFloat(mean_ms.toFixed(4)),
    iterations: ITERATIONS,
    total_ms: parseFloat(total_ms.toFixed(4)),
  }),
);
