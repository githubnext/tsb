/**
 * Benchmark: sortIndexDataFrame with axis=1 — sort column labels on a 100k-row
 * DataFrame with many shuffled columns.
 *
 * Exercises the column-sort code path (axis=1) of sortIndexDataFrame, which
 * is distinct from the default row-index sort (axis=0) benchmarked elsewhere.
 *
 * Outputs JSON: {"function": "sort_index_columns", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, sortIndexDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const N_COLS = 50;
const WARMUP = 5;
const ITERATIONS = 30;

// Build column names that are intentionally shuffled (z-first alphabetical order)
const colNames: string[] = Array.from({ length: N_COLS }, (_, i) => {
  const suffix = String(N_COLS - 1 - i).padStart(3, "0");
  return `col_${suffix}`;
});

const cols: Record<string, number[]> = {};
for (let ci = 0; ci < N_COLS; ci++) {
  cols[colNames[ci]] = Array.from({ length: ROWS }, (_, r) => r * (ci + 1) * 0.001);
}
const df = DataFrame.fromColumns(cols);

// Warm up
for (let i = 0; i < WARMUP; i++) {
  sortIndexDataFrame(df, { axis: 1, ascending: true });
  sortIndexDataFrame(df, { axis: 1, ascending: false });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  sortIndexDataFrame(df, { axis: 1, ascending: true });
  sortIndexDataFrame(df, { axis: 1, ascending: false });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "sort_index_columns",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
