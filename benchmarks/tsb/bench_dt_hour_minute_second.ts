/**
 * Benchmark: dt_hour_minute_second — dt.hour, dt.minute, dt.second on 100k datetime values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const now = Date.now();
const data = Array.from({ length: ROWS }, (_, i) => new Date(now + i * 60_000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.hour();
  s.dt.minute();
  s.dt.second();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.hour();
  s.dt.minute();
  s.dt.second();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_hour_minute_second",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
