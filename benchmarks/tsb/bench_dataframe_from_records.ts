/**
 * Benchmark: DataFrame.fromRecords() — construct a DataFrame from an array of record objects.
 * Outputs JSON: {"function": "dataframe_from_records", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 20_000;
const WARMUP = 5;
const ITERATIONS = 20;

const records = Array.from({ length: ROWS }, (_, i) => ({
  id: i,
  value: i * 1.5,
  category: `cat_${i % 50}`,
  score: i % 2 === 0 ? null : i * 0.1,
  rank: i % 100,
}));

for (let i = 0; i < WARMUP; i++) {
  DataFrame.fromRecords(records);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  DataFrame.fromRecords(records);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);

console.log(
  JSON.stringify({
    function: "dataframe_from_records",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
