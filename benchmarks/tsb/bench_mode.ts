/**
 * Benchmark: mode on 100k-element Series (mixed numeric with repeats)
 */
import { Series, modeSeries } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Create data with ~10 distinct values so mode is meaningful
const data = Float64Array.from({ length: ROWS }, (_, i) => i % 10);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  modeSeries(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  modeSeries(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "mode",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
