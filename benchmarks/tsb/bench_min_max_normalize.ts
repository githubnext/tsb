/**
 * Benchmark: minMaxNormalize — scale a 100k-element Series to [0, 1]
 */
import { Series, minMaxNormalize } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => i * 3.7 - 50_000);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  minMaxNormalize(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  minMaxNormalize(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "min_max_normalize",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
