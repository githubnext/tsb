/**
 * Benchmark: shiftSeries — standalone exported shiftSeries function on 100k-element Series.
 * Mirrors pandas Series.shift().
 * Outputs JSON: {"function": "shift_series_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, shiftSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 1.0) });

for (let i = 0; i < WARMUP; i++) {
  shiftSeries(s, 1);
  shiftSeries(s, -2);
  shiftSeries(s, 5);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  shiftSeries(s, 1);
  shiftSeries(s, -2);
  shiftSeries(s, 5);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "shift_series_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
