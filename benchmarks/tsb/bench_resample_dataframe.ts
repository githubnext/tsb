/**
 * Benchmark: resampleDataFrame — DataFrame resampling with multiple aggregations.
 *
 * The existing `resample` benchmark only covers Series. This benchmark exercises
 * resampleDataFrame on a multi-column datetime-indexed DataFrame, mirroring pandas
 * df.resample("1h").mean() / .sum() / .min().
 *
 * Outputs JSON: {"function": "resample_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, resampleDataFrame } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 3;
const ITERATIONS = 30;

const base = new Date("2020-01-01T00:00:00Z").getTime();
const idx = Array.from({ length: SIZE }, (_, i) => new Date(base + i * 60_000));

const df = DataFrame.fromColumns(
  {
    a: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 50 + 50),
    b: Array.from({ length: SIZE }, (_, i) => Math.cos(i * 0.02) * 30 + 30),
    c: Array.from({ length: SIZE }, (_, i) => (i % 100) * 1.5),
  },
  { index: idx },
);

for (let i = 0; i < WARMUP; i++) {
  resampleDataFrame(df, "H").mean();
  resampleDataFrame(df, "H").sum();
  resampleDataFrame(df, "H").min();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  resampleDataFrame(df, "H").mean();
  resampleDataFrame(df, "H").sum();
  resampleDataFrame(df, "H").min();
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "resample_dataframe",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
