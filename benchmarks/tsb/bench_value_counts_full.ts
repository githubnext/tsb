/**
 * Benchmark: value_counts_full — valueCountsBinned on 100k rows.
 * Outputs JSON: {"function": "value_counts_full", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, valueCountsBinned } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, () => Math.random() * 100) });

for (let i = 0; i < WARMUP; i++) {
  valueCountsBinned(s, { bins: 10 });
  valueCountsBinned(s, { bins: 20 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  valueCountsBinned(s, { bins: 10 });
  valueCountsBinned(s, { bins: 20 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "value_counts_full",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
