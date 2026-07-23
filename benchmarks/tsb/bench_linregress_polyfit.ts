/**
 * Benchmark: linregress and polyfit — simple linear regression and polynomial fit.
 * Dataset: 10,000 points, 20 iterations.
 */
import { linregress, polyfit, polyval } from "../../src/index.js";

const N = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const x = Array.from({ length: N }, (_, i) => i / N);
const y = Array.from({ length: N }, (_, i) => 2.5 * (i / N) + 1.0 + Math.sin(i * 0.01) * 0.1);

for (let i = 0; i < WARMUP; i++) {
  linregress(x, y);
  polyfit(x, y, 2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  linregress(x, y);
  polyfit(x, y, 2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "linregress_polyfit",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
