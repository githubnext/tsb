/**
 * Benchmark: Timedelta.toString() — formatting durations as pandas-style strings.
 * Exercises the formatTimedelta function used internally by toString().
 * Outputs JSON: {"function": "timedelta_tostring", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta, formatTimedelta } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

const SIZE = 1_000;
const deltas = Array.from({ length: SIZE }, (_, i) => {
  const ms = (i - SIZE / 2) * 7_777_777;
  return new Timedelta(ms);
});

for (let w = 0; w < WARMUP; w++) {
  for (const td of deltas.slice(0, 50)) {
    td.toString();
    formatTimedelta(td);
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (const td of deltas) {
    td.toString();
    formatTimedelta(td);
  }
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "timedelta_tostring",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
