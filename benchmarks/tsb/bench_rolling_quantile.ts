/**
 * Benchmark: rolling_quantile — rollingQuantile(series, 0.5, window=100) on 100k-element Series
 */
import { rollingQuantile, Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  rollingQuantile(s, 0.5, 100);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  rollingQuantile(s, 0.5, 100);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "rolling_quantile",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
