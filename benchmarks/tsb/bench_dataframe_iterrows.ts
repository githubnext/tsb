/**
 * Benchmark: DataFrame.iterrows() — iterate over (label, rowSeries) pairs on a 3k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_iterrows", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 3_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => i % 100),
  c: Array.from({ length: ROWS }, (_, i) => `cat_${i % 20}`),
  d: Array.from({ length: ROWS }, (_, i) => (i % 2 === 0 ? null : i * 0.5)),
  e: Array.from({ length: ROWS }, (_, i) => i * 2),
});

for (let i = 0; i < WARMUP; i++) {
  let n = 0;
  for (const [_label, _row] of df.iterrows()) {
    n++;
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  let n = 0;
  for (const [_label, _row] of df.iterrows()) {
    n++;
  }
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);

console.log(
  JSON.stringify({
    function: "dataframe_iterrows",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
