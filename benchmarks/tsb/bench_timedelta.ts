/**
 * Benchmark: Timedelta — construction and arithmetic.
 * Outputs JSON: {"function": "timedelta", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const td1 = Timedelta.fromComponents({ days: 1, hours: 2, minutes: 30 });
const td2 = Timedelta.fromComponents({ hours: 3, minutes: 45, seconds: 10 });
const deltas = Array.from({ length: SIZE }, (_, i) => Timedelta.fromComponents({ days: i % 365, hours: i % 24 }));

for (let i = 0; i < WARMUP; i++) {
  for (const d of deltas) {
    d.add(td1);
    d.subtract(td2);
    void d.totalHours;
    void d.totalSeconds;
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  for (const d of deltas) {
    d.add(td1);
    d.subtract(td2);
    void d.totalHours;
    void d.totalSeconds;
  }
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "timedelta",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
