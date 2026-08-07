/**
 * Benchmark: readParquet / toParquet — Parquet round-trip on 10k rows.
 * DataFrame with int, float, boolean, and string columns; 20 measured iterations.
 */
import { DataFrame, toParquet, readParquet } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const ids = Array.from({ length: ROWS }, (_, i) => i);
const values = Array.from({ length: ROWS }, (_, i) => i * 1.1);
const flags = Array.from({ length: ROWS }, (_, i) => i % 2 === 0);
const labels = Array.from({ length: ROWS }, (_, i) => `item_${i % 100}`);

const df = new DataFrame({ id: ids, value: values, flag: flags, label: labels });

for (let i = 0; i < WARMUP; i++) {
  const buf = toParquet(df);
  readParquet(buf);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const buf = toParquet(df);
  readParquet(buf);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "parquet",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
