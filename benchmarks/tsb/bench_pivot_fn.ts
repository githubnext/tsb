/**
 * Benchmark: pivot standalone — exported pivot(df, options) function on a DataFrame.
 * Mirrors pandas pd.pivot() standalone function.
 * Outputs JSON: {"function": "pivot_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, pivot } from "../../src/index.ts";

const ROWS = 100;
const COLS = 20;
const WARMUP = 5;
const ITERATIONS = 50;

// Build a ROWS×COLS grid of (row, col, val) triples
const rowArr: number[] = [];
const colArr: number[] = [];
const valArr: number[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    rowArr.push(r);
    colArr.push(c);
    valArr.push(r * COLS + c + 0.5);
  }
}
const df = new DataFrame({ row: rowArr, col: colArr, val: valArr });

for (let i = 0; i < WARMUP; i++) {
  pivot(df, { index: "row", columns: "col", values: "val" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pivot(df, { index: "row", columns: "col", values: "val" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pivot_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
