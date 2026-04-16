/**
 * Benchmark: pctChangeDataFrame — percentage change across DataFrame columns.
 * Outputs JSON: {"function": "pctchange_df", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { pctChangeDataFrame, DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.1 + 1),
  b: Array.from({ length: SIZE }, (_, i) => i * 0.5 + 2),
  c: Array.from({ length: SIZE }, (_, i) => i * 2.3 + 3),
});

for (let i = 0; i < WARMUP; i++) {
  pctChangeDataFrame(df);
  pctChangeDataFrame(df, { periods: 3 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  pctChangeDataFrame(df);
  pctChangeDataFrame(df, { periods: 3 });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "pctchange_df",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
