/**
 * Benchmark: Series comparison operators (eq, ne, lt, gt, le, ge) on 100k Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const s = new Series({ data });
const threshold = ROWS * 0.05;

for (let i = 0; i < WARMUP; i++) {
  s.eq(threshold);
  s.ne(threshold);
  s.lt(threshold);
  s.gt(threshold);
  s.le(threshold);
  s.ge(threshold);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.eq(threshold);
  s.ne(threshold);
  s.lt(threshold);
  s.gt(threshold);
  s.le(threshold);
  s.ge(threshold);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_compare",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
