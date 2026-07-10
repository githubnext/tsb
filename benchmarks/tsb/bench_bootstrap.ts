/**
 * Benchmark: bootstrap confidence interval on 1000-element array
 * Uses percentile method with 500 resamples for a realistic workload.
 */
import { bootstrap1 } from "../../src/index.js";

const N = 1_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: N }, (_, i) => Math.sin(i * 0.01) * 50 + 100);
const arr = Array.from(data);

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

for (let i = 0; i < WARMUP; i++) {
  bootstrap1(arr, mean, { n: 500, method: "percentile", seed: 42 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  bootstrap1(arr, mean, { n: 500, method: "percentile", seed: 42 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "bootstrap",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
