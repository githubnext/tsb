/**
 * Benchmark: datetime_tz — tz_localize and tz_convert on DatetimeIndex.
 * Outputs JSON: {"function": "datetime_tz", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { date_range, tz_localize, tz_convert } from "../../src/index.js";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const naive = date_range({ start: "2024-01-01", periods: SIZE, freq: "H" });

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  const ny = tz_localize(naive, "America/New_York");
  tz_convert(ny, "UTC");
  tz_convert(ny, "Europe/London");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const ny = tz_localize(naive, "America/New_York");
  tz_convert(ny, "UTC");
  tz_convert(ny, "Europe/London");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "datetime_tz",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
