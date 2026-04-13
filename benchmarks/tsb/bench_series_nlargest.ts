/**
 * Benchmark: Series.nlargest — top-100 elements from a 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.007) * 500 + i * 0.001);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.nlargest(100);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.nlargest(100);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_nlargest",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
