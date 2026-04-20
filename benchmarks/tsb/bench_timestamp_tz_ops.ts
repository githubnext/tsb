/**
 * Benchmark: Timestamp instance tz_localize + tz_convert — timezone ops on individual Timestamps.
 * Outputs JSON: {"function": "timestamp_tz_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timestamp } from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 5;
const ITERATIONS = 50;

const timestamps = Array.from(
  { length: SIZE },
  (_, i) => new Timestamp(Date.UTC(2020, i % 12, (i % 28) + 1, i % 24, i % 60, 0)),
);

for (let i = 0; i < WARMUP; i++) {
  for (const ts of timestamps.slice(0, 100)) {
    ts.tz_localize("UTC");
    ts.tz_convert("America/New_York");
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const ts of timestamps) {
    ts.tz_localize("UTC");
    const nyTs = ts.tz_convert("America/New_York");
    nyTs.tz_convert("Europe/London");
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "timestamp_tz_ops",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
