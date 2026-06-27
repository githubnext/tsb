/**
 * Benchmark: DataFrame-to-DataFrame element-wise comparisons.
 *
 * The existing `dataframe_compare` benchmark only tests scalar comparisons (df vs 50).
 * This benchmark tests DataFrame-to-DataFrame element-wise comparisons:
 * dataFrameEq(df1, df2), dataFrameNe(df1, df2), dataFrameGt(df1, df2), dataFrameLe(df1, df2).
 * Mirrors pandas df1.eq(df2), df1.ne(df2), df1.gt(df2), df1.le(df2).
 *
 * Outputs JSON: {"function": "dataframe_compare_pair", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  DataFrame,
  dataFrameEq,
  dataFrameNe,
  dataFrameGt,
  dataFrameLe,
} from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df1 = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i * 1.7) % 1000),
  b: Array.from({ length: SIZE }, (_, i) => (i * 2.3) % 1000),
  c: Array.from({ length: SIZE }, (_, i) => i % 100),
});

const df2 = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i * 2.1) % 1000),
  b: Array.from({ length: SIZE }, (_, i) => (i * 1.9) % 1000),
  c: Array.from({ length: SIZE }, (_, i) => (i + 7) % 100),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameEq(df1, df2);
  dataFrameNe(df1, df2);
  dataFrameGt(df1, df2);
  dataFrameLe(df1, df2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameEq(df1, df2);
  dataFrameNe(df1, df2);
  dataFrameGt(df1, df2);
  dataFrameLe(df1, df2);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_compare_pair",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
