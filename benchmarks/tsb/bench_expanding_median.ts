/**
 * Benchmark: Expanding.median on 10k-element Series (median is O(n^2))
 */
import { Series } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 2;
const ITERATIONS = 5;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.expanding().median();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.expanding().median();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "expanding_median",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
