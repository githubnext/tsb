/**
 * Benchmark: DataFrameGroupBy.sum() with 1000 groups on a 100k-row DataFrame.
 * Outputs JSON: {"function": "groupby_sum_many_groups", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const N_GROUPS = 1_000;
const WARMUP = 3;
const ITERATIONS = 10;

const df = DataFrame.fromColumns({
  key: Array.from({ length: ROWS }, (_, i) => `g${i % N_GROUPS}`),
  val1: Array.from({ length: ROWS }, (_, i) => i * 0.5),
  val2: Array.from({ length: ROWS }, (_, i) => i % 200),
});

for (let i = 0; i < WARMUP; i++) {
  df.groupby("key").sum();
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.groupby("key").sum();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);

console.log(
  JSON.stringify({
    function: "groupby_sum_many_groups",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
