/**
 * Benchmark: skewSeries / kurtSeries — skewness and kurtosis on a 100k-element Series.
 * Outputs JSON: {"function": "skew_kurt", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, skewSeries, kurtSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Float64Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  skewSeries(s);
  kurtSeries(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  skewSeries(s);
  kurtSeries(s);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "skew_kurt", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
