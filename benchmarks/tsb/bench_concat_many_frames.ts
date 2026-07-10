/**
 * Benchmark: concat() with 20 DataFrames — many-frame concatenation on 100k total rows.
 * Outputs JSON: {"function": "concat_many_frames", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, concat } from "../../src/index.ts";

const N_FRAMES = 20;
const ROWS_EACH = 5_000;
const WARMUP = 5;
const ITERATIONS = 20;

const frames = Array.from({ length: N_FRAMES }, (_, f) =>
  DataFrame.fromColumns({
    a: Array.from({ length: ROWS_EACH }, (_, i) => (f * ROWS_EACH + i) * 1.0),
    b: Array.from({ length: ROWS_EACH }, (_, i) => (f * ROWS_EACH + i) % 100),
    c: Array.from({ length: ROWS_EACH }, (_, i) => `cat_${i % 20}`),
  }),
);

for (let i = 0; i < WARMUP; i++) {
  concat(frames);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  concat(frames);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);

console.log(
  JSON.stringify({
    function: "concat_many_frames",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
