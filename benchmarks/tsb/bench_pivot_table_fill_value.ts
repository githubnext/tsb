/**
 * Benchmark: pivotTable with fill_value — fills missing cells with 0 instead of null.
 * Outputs JSON: {"function": "pivot_table_fill_value", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, pivotTable } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Sparse data — not all (row, col) combos exist, so fill_value matters
const rows = Array.from({ length: ROWS }, (_, i) => `row_${i % 50}`);
const cols = Array.from({ length: ROWS }, (_, i) => `col_${i % 30}`);
const vals = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const df = DataFrame.fromColumns({ row: rows, col: cols, value: vals });

for (let i = 0; i < WARMUP; i++) {
  pivotTable(df, { values: "value", index: "row", columns: "col", aggfunc: "sum", fill_value: 0 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pivotTable(df, { values: "value", index: "row", columns: "col", aggfunc: "sum", fill_value: 0 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pivot_table_fill_value",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
