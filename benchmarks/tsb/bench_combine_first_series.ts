/**
 * Benchmark: combineFirstSeries (standalone) — fill missing values from another Series.
 * Outputs JSON: {"function": "combine_first_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { combineFirstSeries, Series } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data1: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 3 === 0 ? null : i * 0.5,
);
const data2 = Array.from({ length: SIZE }, (_, i) => i * 0.1);
const s1 = new Series({ data: data1 });
const s2 = new Series({ data: data2 });

for (let i = 0; i < WARMUP; i++) {
  combineFirstSeries(s1, s2);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  combineFirstSeries(s1, s2);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "combine_first_series",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
