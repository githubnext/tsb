/**
 * Benchmark: math_ops — absSeries / absDataFrame / roundSeries / roundDataFrame on 100k rows.
 * Outputs JSON: {"function": "math_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, absSeries, absDataFrame, roundSeries, roundDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i % 2 === 0 ? -(i + 0.567) : i + 0.567)) });
const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => -(i + 0.123)),
  b: Array.from({ length: SIZE }, (_, i) => i + 0.456),
});

for (let i = 0; i < WARMUP; i++) {
  absSeries(s);
  absDataFrame(df);
  roundSeries(s, 1);
  roundDataFrame(df, 1);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  absSeries(s);
  absDataFrame(df);
  roundSeries(s, 1);
  roundDataFrame(df, 1);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "math_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
