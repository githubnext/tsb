/**
 * Benchmark: rollingAgg (multi-aggregation rolling window) on 100k-element Series
 */
import { Series, rollingAgg } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const s = new Series(data);
const fns = {
  mean: (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length,
  sum: (v: readonly number[]) => v.reduce((a, b) => a + b, 0),
};

for (let i = 0; i < WARMUP; i++) {
  rollingAgg(s, 10, fns);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  rollingAgg(s, 10, fns);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "rolling_agg",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
