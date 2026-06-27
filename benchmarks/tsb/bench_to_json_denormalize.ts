/**
 * Benchmark: to_json_denormalize — toJsonDenormalize / toJsonRecords / toJsonSplit / toJsonIndex
 * Outputs JSON: {"function": "to_json_denormalize", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, toJsonDenormalize, toJsonRecords, toJsonSplit, toJsonIndex } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Create a nested-structure-like DataFrame (address.city, address.zip pattern)
const df = DataFrame.fromColumns({
  "name": Array.from({ length: ROWS }, (_, i) => `user_${i}`),
  "address.city": Array.from({ length: ROWS }, (_, i) => `city_${i % 100}`),
  "address.zip": Array.from({ length: ROWS }, (_, i) => `${10000 + (i % 9000)}`),
  "score": Float64Array.from({ length: ROWS }, (_, i) => i * 0.01),
});

for (let i = 0; i < WARMUP; i++) {
  toJsonDenormalize(df);
  toJsonRecords(df);
  toJsonSplit(df);
  toJsonIndex(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toJsonDenormalize(df);
  toJsonRecords(df);
  toJsonSplit(df);
  toJsonIndex(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_json_denormalize",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
