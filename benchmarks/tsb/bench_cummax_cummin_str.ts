/**
 * Benchmark: cummax / cummin on string Series of 10k elements.
 * Outputs JSON: {"function": "cummax_cummin_str", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, cummax, cummin } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const words = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew"];
const data: string[] = Array.from({ length: SIZE }, (_, i) => words[i % words.length]);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  cummax(s);
  cummin(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cummax(s);
  cummin(s);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "cummax_cummin_str", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
