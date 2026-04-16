/**
 * Benchmark: skewDataFrame / kurtDataFrame — skewness and kurtosis on a 10k×10 DataFrame.
 * Outputs JSON: {"function": "dataframe_skew_kurt", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, skewDataFrame, kurtDataFrame } from "../../src/index.ts";

const ROWS = 10_000;
const COLS = 10;
const WARMUP = 5;
const ITERATIONS = 20;

const columns: Record<string, number[]> = {};
for (let c = 0; c < COLS; c++) {
  columns[`col${c}`] = Array.from({ length: ROWS }, (_, i) => Math.sin((i + c) * 0.01) * 100);
}
const df = new DataFrame(columns);

for (let i = 0; i < WARMUP; i++) {
  skewDataFrame(df);
  kurtDataFrame(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  skewDataFrame(df);
  kurtDataFrame(df);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "dataframe_skew_kurt", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
