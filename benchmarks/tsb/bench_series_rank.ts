/**
 * Benchmark: Series.rank — rank 100k elements
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.03) * 1000);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.rank();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.rank();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_rank",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
