/**
 * Benchmark: shiftSeries and diffSeries on 100k-element Series
 */
import { Series, shiftSeries, diffSeries } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => i * 1.5);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  shiftSeries(s, 1);
  diffSeries(s, 1);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  shiftSeries(s, 1);
  diffSeries(s, 1);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "shift_diff",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
