/**
 * Benchmark: dataFrameRollingAgg on a 100k-row DataFrame
 */
import { DataFrame, Series, dataFrameRollingAgg } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = new Series(Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01)));
const b = new Series(Float64Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.01)));
const df = new DataFrame({ a, b });
const fns = {
  mean: (v: readonly number[]) => v.reduce((x, y) => x + y, 0) / v.length,
  sum: (v: readonly number[]) => v.reduce((x, y) => x + y, 0),
};

for (let i = 0; i < WARMUP; i++) {
  dataFrameRollingAgg(df, 10, fns);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameRollingAgg(df, 10, fns);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_rolling_agg",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
