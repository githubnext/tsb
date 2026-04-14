/**
 * Benchmark: dt_floor_ceil — dt.floor and dt.ceil on 100k datetime values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const now = Date.now();
const data = Array.from({ length: ROWS }, (_, i) => new Date(now + i * 60_000));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.dt.floor("H");
  s.dt.ceil("H");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.dt.floor("H");
  s.dt.ceil("H");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dt_floor_ceil",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
