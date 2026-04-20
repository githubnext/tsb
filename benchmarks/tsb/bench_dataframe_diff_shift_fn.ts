/**
 * Benchmark: diffDataFrame / shiftDataFrame — standalone diff and shift for DataFrames.
 * Mirrors pandas DataFrame.diff() / DataFrame.shift().
 * Outputs JSON: {"function": "dataframe_diff_shift_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, diffDataFrame, shiftDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.0),
  b: Array.from({ length: SIZE }, (_, i) => i * 0.5 + 100),
  c: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 1000),
});

for (let i = 0; i < WARMUP; i++) {
  diffDataFrame(df, { periods: 1 });
  shiftDataFrame(df, { periods: 3 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  diffDataFrame(df, { periods: 1 });
  shiftDataFrame(df, { periods: 3 });
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "dataframe_diff_shift_fn",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
