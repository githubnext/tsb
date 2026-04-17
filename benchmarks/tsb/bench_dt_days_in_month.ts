/**
 * Benchmark: dt_days_in_month — dt.days_in_month on 100k datetime values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const start2020 = new Date("2020-01-01").getTime();
const data = Array.from({ length: ROWS }, (_, i) => new Date(start2020 + i * 86_400_000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.days_in_month();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.days_in_month();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_days_in_month",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
