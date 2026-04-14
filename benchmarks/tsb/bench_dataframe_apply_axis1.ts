/**
 * Benchmark: DataFrame.apply with axis=1 (row-wise) on 10k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 2;
const ITERATIONS = 10;

const a = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const b = Array.from({ length: ROWS }, (_, i) => i * 0.2);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  df.apply((s) => s.sum(), 1);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.apply((s) => s.sum(), 1);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_apply_axis1",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
