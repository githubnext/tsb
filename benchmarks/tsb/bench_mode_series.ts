/**
 * Benchmark: modeSeries — mode of a 10k-element integer Series.
 * Outputs JSON: {"function": "mode_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, modeSeries } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

// 10k integers with bounded range to create repeated values
const data = Array.from({ length: SIZE }, (_, i) => i % 200);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  modeSeries(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  modeSeries(s);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "mode_series", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
