/**
 * Benchmark: toSql — write a DataFrame to a SQL table via a mock adapter.
 *
 * `toSql` serialises a DataFrame into row-objects and calls the connection's
 * `execute` / `executemany` method.  This benchmark exercises the
 * serialisation path without a real database.
 *
 * Dataset: 10 000-row DataFrame (3 columns: id, value, label).
 * Outputs JSON: {"function": "to_sql", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, toSql } from "../../src/index.js";
import type { SqlConnection, SqlResult, SqlRow, SqlValue, IfExistsStrategy } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

const ids = Array.from({ length: ROWS }, (_, i) => i);
const values = Array.from({ length: ROWS }, (_, i) => Math.round(Math.random() * 1000));
const labels = Array.from({ length: ROWS }, (_, i) => `item_${i % 200}`);

const df = new DataFrame({
  id: new Series(ids),
  value: new Series(values),
  label: new Series(labels),
});

/** Minimal mock connection that captures but discards written rows. */
class MockConn implements SqlConnection {
  query(_sql: string, _params?: readonly SqlValue[]): SqlResult {
    return { columns: [], rows: [] };
  }
  listTables(): readonly string[] {
    return [];
  }
  insert(
    _tableName: string,
    rows: readonly SqlRow[],
    _columns: readonly string[],
    _ifExists: IfExistsStrategy,
  ): number {
    // no-op: just return the row count
    return rows.length;
  }
}

const conn = new MockConn();

function run(): void {
  toSql(df, "sensors", conn, { ifExists: "replace" });
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_sql",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
