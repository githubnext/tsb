/**
 * Benchmark: dt_normalize — dt.normalize (truncate to midnight) on 100k datetime values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const now = Date.now();
const data = Array.from({ length: ROWS }, (_, i) => new Date(now + i * 60_000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.normalize();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.normalize();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_normalize",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
