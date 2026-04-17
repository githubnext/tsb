/**
 * Benchmark: dt_is_month_start_end — dt.is_month_start and dt.is_month_end on 100k datetime values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const start2020 = new Date("2020-01-01").getTime();
const data = Array.from({ length: ROWS }, (_, i) => new Date(start2020 + i * 86_400_000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.is_month_start();
  s.dt.is_month_end();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.is_month_start();
  s.dt.is_month_end();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_is_month_start_end",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
