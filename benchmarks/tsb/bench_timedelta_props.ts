/**
 * Benchmark: Timedelta property getters — days, hours, minutes, seconds, ms, absMs, sign, totalMs.
 * Mirrors pandas Timedelta component properties.
 * Outputs JSON: {"function": "timedelta_props", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

const SIZE = 2_000;
const deltas = Array.from({ length: SIZE }, (_, i) =>
  new Timedelta((i - SIZE / 2) * 3_661_001), // varied durations
);

for (let w = 0; w < WARMUP; w++) {
  for (const td of deltas.slice(0, 100)) {
    void td.days;
    void td.hours;
    void td.minutes;
    void td.seconds;
    void td.ms;
    void td.absMs;
    void td.sign;
    void td.totalMs;
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (const td of deltas) {
    void td.days;
    void td.hours;
    void td.minutes;
    void td.seconds;
    void td.ms;
    void td.absMs;
    void td.sign;
    void td.totalMs;
  }
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "timedelta_props",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
