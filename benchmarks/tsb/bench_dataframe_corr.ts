/**
 * Benchmark: dataFrameCorr — pairwise Pearson correlation on a 10k-row DataFrame
 */
import { DataFrame, dataFrameCorr } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const b = Float64Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.01));
const c = Float64Array.from({ length: ROWS }, (_, i) => i * 0.001);
const df = new DataFrame({ a, b, c });

for (let i = 0; i < WARMUP; i++) {
  dataFrameCorr(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameCorr(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_corr",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
