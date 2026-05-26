/**
 * Benchmark: na_ops — isna / notna / ffillSeries / bfillSeries on 100k rows.
 * Outputs JSON: {"function": "na_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, isna, notna, ffillSeries, bfillSeries, dataFrameFfill, dataFrameBfill } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 5 === 0 ? null : i,
);
const s = new Series({ data });
const df = DataFrame.fromColumns({
  a: data,
  b: Array.from({ length: SIZE }, (_, i) => (i % 7 === 0 ? null : i * 2)),
});

for (let i = 0; i < WARMUP; i++) {
  isna(s);
  notna(s);
  ffillSeries(s);
  bfillSeries(s);
  dataFrameFfill(df);
  dataFrameBfill(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  isna(s);
  notna(s);
  ffillSeries(s);
  bfillSeries(s);
  dataFrameFfill(df);
  dataFrameBfill(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "na_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
