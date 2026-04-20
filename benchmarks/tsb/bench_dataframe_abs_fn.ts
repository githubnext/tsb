/**
 * Benchmark: dataFrameAbs standalone — absolute value on a 100k-row × 4-column DataFrame.
 * Uses the exported dataFrameAbs function (not the .abs() method).
 * Outputs JSON: {"function": "dataframe_abs_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameAbs } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 200) - 100),
  b: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100),
  c: Array.from({ length: SIZE }, (_, i) => -i * 0.5),
  d: Array.from({ length: SIZE }, (_, i) => (i % 50) - 25),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameAbs(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameAbs(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_abs_fn",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
