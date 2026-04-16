/**
 * Benchmark: dt_quarter_month — dt.quarter, dt.is_month_start, dt.is_month_end on 100k datetime values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const now = new Date("2024-01-01").getTime();
const data = Array.from({ length: ROWS }, (_, i) => new Date(now + i * 24 * 3600 * 1000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.quarter();
  s.dt.is_month_start();
  s.dt.is_month_end();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.quarter();
  s.dt.is_month_start();
  s.dt.is_month_end();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_quarter_month",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
