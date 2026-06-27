/**
 * Benchmark: DataFrame.itertuples() — iterate over rows as record objects.
 * Outputs JSON: {"function": "dataframe_itertuples", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 1_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = DataFrame.fromColumns({
  x: Array.from({ length: ROWS }, (_, i) => i * 1.5),
  y: Array.from({ length: ROWS }, (_, i) => i * 2.5),
  z: Array.from({ length: ROWS }, (_, i) => i * 3.5),
});

for (let i = 0; i < WARMUP; i++) {
  for (const _row of df.itertuples()) {
    /* warm up */
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (const _row of df.itertuples()) {
    /* iterate */
  }
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "dataframe_itertuples",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
