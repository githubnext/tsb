/**
 * Benchmark: isin standalone — exported isin(series, values) function on 100k-element Series.
 * Mirrors pandas Series.isin() called as a standalone function.
 * Outputs JSON: {"function": "isin_series_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, isin } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 5000) });
const testSet = Array.from({ length: 2500 }, (_, i) => i);
const testSet2 = [100, 200, 300, 400, 500];

for (let i = 0; i < WARMUP; i++) {
  isin(s, testSet);
  isin(s, testSet2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  isin(s, testSet);
  isin(s, testSet2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "isin_series_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
