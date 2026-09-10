/**
 * Benchmark: stack / unstack
 *
 * Mirrors pandas DataFrame.stack() and Series.unstack().
 * Dataset: 1 000-row × 5-column DataFrame of random floats.
 * Operations measured:
 *   - stack()   — pivot column labels into the row index → Series
 *   - unstack() — reverse the stack back to a DataFrame
 */

import { DataFrame, Series } from "../../src/index.js";
import type { Scalar } from "../../src/types.js";

const ROWS = 1_000;
const COLS = ["a", "b", "c", "d", "e"];
const WARMUP = 3;
const ITERS = 20;

// ─── build dataset ────────────────────────────────────────────────────────────

const data: Record<string, Scalar[]> = {};
for (const col of COLS) {
  const arr: Scalar[] = new Array<Scalar>(ROWS);
  for (let i = 0; i < ROWS; i++) arr[i] = Math.random() * 100;
  data[col] = arr;
}
const df = new DataFrame(data);

// ─── warm-up ──────────────────────────────────────────────────────────────────

for (let i = 0; i < WARMUP; i++) {
  const s = df.stack();
  s.unstack();
}

// ─── measure stack ────────────────────────────────────────────────────────────

const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  df.stack();
}
const stackMs = (performance.now() - t0) / ITERS;

// ─── measure unstack ──────────────────────────────────────────────────────────

const stacked = df.stack();
const t1 = performance.now();
for (let i = 0; i < ITERS; i++) {
  stacked.unstack();
}
const unstackMs = (performance.now() - t1) / ITERS;

const meanMs = (stackMs + unstackMs) / 2;

console.log(
  JSON.stringify({
    function: "stack_unstack",
    mean_ms: parseFloat(meanMs.toFixed(4)),
    stack_ms: parseFloat(stackMs.toFixed(4)),
    unstack_ms: parseFloat(unstackMs.toFixed(4)),
    iterations: ITERS,
    rows: ROWS,
    cols: COLS.length,
  }),
);
