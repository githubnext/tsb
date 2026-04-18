/**
 * Benchmark: DateOffset Hour and Second — apply operations on 5k dates.
 * Outputs JSON: {"function": "date_offset_hour_second", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Hour, Second } from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 5;
const ITERATIONS = 50;

const hour = new Hour(3);
const second = new Second(90);
const base = new Date(Date.UTC(2020, 0, 15, 10, 0, 0));
const dates = Array.from({ length: SIZE }, (_, i) => new Date(base.getTime() + i * 60_000));

for (let i = 0; i < WARMUP; i++) {
  for (const d of dates.slice(0, 100)) {
    hour.apply(d);
    second.apply(d);
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  for (const d of dates) {
    hour.apply(d);
    second.apply(d);
  }
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "date_offset_hour_second",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
