/**
 * Benchmark: getDummies / dataFrameGetDummies — one-hot encoding.
 * Outputs JSON: {"function": "get_dummies", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { getDummies, dataFrameGetDummies, Series, DataFrame } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 3;
const ITERATIONS = 30;

const categories = ["A", "B", "C", "D", "E"];
const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => categories[i % categories.length]) });
const df = new DataFrame({
  cat1: Array.from({ length: SIZE }, (_, i) => categories[i % categories.length]),
  cat2: Array.from({ length: SIZE }, (_, i) => ["x", "y", "z"][i % 3]),
});

for (let i = 0; i < WARMUP; i++) {
  getDummies(s);
  dataFrameGetDummies(df, { columns: ["cat1", "cat2"] });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  getDummies(s);
  dataFrameGetDummies(df, { columns: ["cat1", "cat2"] });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "get_dummies",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
