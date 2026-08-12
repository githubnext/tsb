/**
 * Benchmark: cut / qcut — bin continuous data into discrete intervals.
 *
 * Mirrors pandas `pandas.cut` and `pandas.qcut`.
 * Tests fixed-bin cut and quantile-based qcut on a 100k-row dataset.
 * Outputs JSON: {"function": "cut_qcut", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { cut, qcut } from "../../src/index.ts";

const N = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// 100k values uniformly in [0, 1000)
const data = Array.from({ length: N }, (_, i) => (i * 1000) / N + Math.sin(i) * 0.5);

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  cut(data, 10);
  qcut(data, 10);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cut(data, 10);
  qcut(data, 10);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cut_qcut",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total_ms,
  }),
);
