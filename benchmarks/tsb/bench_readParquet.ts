/**
 * Benchmark: readParquet / toParquet — Parquet round-trip on 10k rows
 */
import { DataFrame, toParquet, readParquet } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build a DataFrame with int, float, and string columns
const ids = Array.from({ length: ROWS }, (_, i) => i);
const values = Array.from({ length: ROWS }, (_, i) => i * 1.1);
const labels = Array.from({ length: ROWS }, (_, i) => `cat_${i % 50}`);

const df = new DataFrame({ id: ids, value: values, label: labels });

// Warm up
for (let i = 0; i < WARMUP; i++) {
  const buf = toParquet(df);
  readParquet(buf);
}

// Measure round-trip
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const buf = toParquet(df);
  readParquet(buf);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "readParquet",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
