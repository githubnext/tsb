/**
 * Benchmark: Timestamp — construction and component accessors.
 * Outputs JSON: {"function": "timestamp", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timestamp } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const dates = Array.from({ length: SIZE }, (_, i) => new Date(Date.UTC(2020, 0, 1) + i * 86_400_000));

for (let i = 0; i < WARMUP; i++) {
  for (const d of dates) {
    const ts = new Timestamp(d);
    void ts.year;
    void ts.month;
    void ts.dayofweek;
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  for (const d of dates) {
    const ts = new Timestamp(d);
    void ts.year;
    void ts.month;
    void ts.dayofweek;
  }
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "timestamp",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
