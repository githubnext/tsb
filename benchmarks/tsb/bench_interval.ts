/**
 * Benchmark: Interval / IntervalIndex — closed/open intervals.
 * Outputs JSON: {"function": "interval", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Interval, IntervalIndex } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const intervals = Array.from({ length: SIZE }, (_, i) => new Interval(i, i + 1));
const breaks = Array.from({ length: 1_001 }, (_, i) => i);

for (let i = 0; i < WARMUP; i++) {
  for (const iv of intervals.slice(0, 100)) {
    void iv.contains(iv.mid);
    void iv.length;
    void iv.toString();
  }
  IntervalIndex.fromBreaks(breaks);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  for (const iv of intervals) {
    void iv.contains(iv.mid);
    void iv.length;
    void iv.toString();
  }
  IntervalIndex.fromBreaks(breaks);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "interval",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
