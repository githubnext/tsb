/**
 * Benchmark: sampleSeries / sampleDataFrame with weights option on 100k rows.
 * Outputs JSON: {"function": "sample_weights", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, sampleSeries, sampleDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: SIZE }, (_, i) => i * 1.0);
// Exponentially increasing weights so later rows are more likely to be picked
const weights = Array.from({ length: SIZE }, (_, i) => Math.exp((i / SIZE) * 3));

const s = new Series({ data });

const df = DataFrame.fromColumns({
  a: data,
  b: Array.from({ length: SIZE }, (_, i) => i * 2.0),
  c: Array.from({ length: SIZE }, (_, i) => i * 3.0),
});

for (let i = 0; i < WARMUP; i++) {
  sampleSeries(s, { n: 1000, weights });
  sampleDataFrame(df, { n: 1000, weights });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  sampleSeries(s, { n: 1000, weights });
  sampleDataFrame(df, { n: 1000, weights });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "sample_weights",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
