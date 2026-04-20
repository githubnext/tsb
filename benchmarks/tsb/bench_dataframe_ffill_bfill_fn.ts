/**
 * Benchmark: dataFrameFfill / dataFrameBfill — standalone forward/backward fill for DataFrames.
 * Mirrors pandas DataFrame.ffill() / DataFrame.bfill().
 * Outputs JSON: {"function": "dataframe_ffill_bfill_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameFfill, dataFrameBfill } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 1.0)),
  b: Array.from({ length: SIZE }, (_, i) => (i % 7 === 0 ? null : i * 0.5)),
  c: Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : i * 2.0)),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameFfill(df);
  dataFrameBfill(df);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  dataFrameFfill(df);
  dataFrameBfill(df);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "dataframe_ffill_bfill_fn",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
