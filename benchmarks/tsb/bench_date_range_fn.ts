/**
 * Benchmark: dateRange — standalone function to generate date sequences.
 * Mirrors pandas pd.date_range().
 * Outputs JSON: {"function": "date_range_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { dateRange } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

const start = new Date("2020-01-01");
const end = new Date("2020-12-31");

for (let i = 0; i < WARMUP; i++) {
  dateRange({ start, end, freq: "D" });
  dateRange({ start, periods: 1000, freq: "h" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  dateRange({ start, end, freq: "D" });
  dateRange({ start, periods: 1000, freq: "h" });
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "date_range_fn",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
