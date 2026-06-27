/**
 * Benchmark: reduce_ops — nuniqueSeries / anySeries / allSeries / nunique(df) on 100k rows.
 * Outputs JSON: {"function": "reduce_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, nuniqueSeries, anySeries, allSeries, nunique } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i % 1000) });
const boolSeries = new Series({ data: Array.from({ length: SIZE }, (_, i) => i > 0) });
const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i % 500),
  b: Array.from({ length: SIZE }, (_, i) => i % 200),
  c: Array.from({ length: SIZE }, (_, i) => i % 100),
});

for (let i = 0; i < WARMUP; i++) {
  nuniqueSeries(s);
  anySeries(boolSeries);
  allSeries(boolSeries);
  nunique(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nuniqueSeries(s);
  anySeries(boolSeries);
  allSeries(boolSeries);
  nunique(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "reduce_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
