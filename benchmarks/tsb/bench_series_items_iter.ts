/**
 * Benchmark: Series.items() / Series.iteritems() — iterate over (label, value) pairs.
 * Outputs JSON: {"function": "series_items_iter", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({
  data: Array.from({ length: SIZE }, (_, i) => i * 1.1),
  index: Array.from({ length: SIZE }, (_, i) => `row_${i}`),
});

for (let i = 0; i < WARMUP; i++) {
  for (const _pair of s.items()) {
    /* warm up */
  }
  for (const _pair of s.iteritems()) {
    /* warm up */
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (const _pair of s.items()) {
    /* iterate */
  }
  for (const _pair of s.iteritems()) {
    /* iterate */
  }
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "series_items_iter",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
