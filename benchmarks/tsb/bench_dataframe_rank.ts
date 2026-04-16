/**
 * Benchmark: rankDataFrame on a 10k-row DataFrame
 */
import { DataFrame, rankDataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const a = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.1));
const b = Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.1));
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  rankDataFrame(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  rankDataFrame(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_rank",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
