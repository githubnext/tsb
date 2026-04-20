/**
 * Benchmark: dataFrameCumsum / dataFrameCumprod with axis=1 (row-wise) on 10k x 8 DataFrame.
 * Outputs JSON: {"function": "dataframe_cumops_axis1", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameCumsum, dataFrameCumprod } from "../../src/index.ts";

const ROWS = 10_000;
const COLS = 8;
const WARMUP = 3;
const ITERATIONS = 20;

const data: Record<string, number[]> = {};
for (let c = 0; c < COLS; c++) {
  data[`col${c}`] = Array.from({ length: ROWS }, (_, i) => ((i + c) % 10) * 0.1 + 1);
}
const df = new DataFrame(data);

for (let i = 0; i < WARMUP; i++) {
  dataFrameCumsum(df, { axis: 1 });
  dataFrameCumprod(df, { axis: 1 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameCumsum(df, { axis: 1 });
  dataFrameCumprod(df, { axis: 1 });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "dataframe_cumops_axis1", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
