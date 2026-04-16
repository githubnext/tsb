/**
 * Benchmark: replaceDataFrame — replace values in a DataFrame.
 * Outputs JSON: {"function": "replace_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { replaceDataFrame, DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i % 10),
  b: Array.from({ length: SIZE }, (_, i) => i % 5),
  c: Array.from({ length: SIZE }, (_, i) => ["x", "y", "z"][i % 3]),
});
const mapping = new Map<number, number>([
  [0, 100],
  [1, 200],
  [2, 300],
]);

for (let i = 0; i < WARMUP; i++) {
  replaceDataFrame(df, mapping);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  replaceDataFrame(df, mapping);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "replace_dataframe",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
