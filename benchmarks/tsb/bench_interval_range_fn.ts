/**
 * Benchmark: intervalRange — create an IntervalIndex from start/end with periods.
 * Mirrors pandas pd.interval_range().
 * Outputs JSON: {"function": "interval_range_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { intervalRange } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

for (let i = 0; i < WARMUP; i++) {
  intervalRange(0, 1000, { periods: 10_000 });
  intervalRange(0, 100, { freq: 0.01 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  intervalRange(0, 1000, { periods: 10_000 });
  intervalRange(0, 100, { freq: 0.01 });
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "interval_range_fn",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
