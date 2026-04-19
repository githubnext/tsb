/**
 * Benchmark: dataFrameRound standalone — round a 100k-row × 4-column DataFrame to 2 decimals.
 * Uses the exported dataFrameRound function (not the .round() method).
 * Outputs JSON: {"function": "dataframe_round_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameRound } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 0.123456),
  b: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 99.9),
  c: Array.from({ length: SIZE }, (_, i) => -i * 0.987654),
  d: Array.from({ length: SIZE }, (_, i) => (i % 1000) * 3.14159),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameRound(df, { decimals: 2 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameRound(df, { decimals: 2 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_round_fn",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
