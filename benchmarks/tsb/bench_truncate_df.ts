/**
 * Benchmark: truncateDataFrame — slice rows by before/after labels on 100k-row DataFrame
 * Outputs JSON: {"function": "truncate_df", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, truncateDataFrame } from "../../src/index.ts";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const index = Array.from({ length: N }, (_, i) => i);
const a = Array.from({ length: N }, (_, i) => i * 1.0);
const b = Array.from({ length: N }, (_, i) => i * 2.0);
const c = Array.from({ length: N }, (_, i) => i * 3.0);

const df = DataFrame.fromColumns({ a, b, c }, { index });

for (let i = 0; i < WARMUP; i++) {
  truncateDataFrame(df, 10_000, 90_000);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  truncateDataFrame(df, 10_000, 90_000);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "truncate_df",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
