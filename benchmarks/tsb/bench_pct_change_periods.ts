/**
 * Benchmark: pctChangeSeries / pctChangeDataFrame with various period values.
 * Outputs JSON: {"function": "pct_change_periods", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, pctChangeSeries, pctChangeDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

let s = 7;
const rand = () => {
  s = (s * 1664525 + 1013904223) & 0x7fffffff;
  return s / 0x7fffffff;
};

const data = Array.from({ length: ROWS }, () => rand() * 100 + 10);
const series = new Series({ data });

const df = new DataFrame({
  a: data,
  b: data.map((v) => v * 1.5),
  c: data.map((v) => v * 0.8),
});

for (let i = 0; i < WARMUP; i++) {
  pctChangeSeries(series, { periods: 1 });
  pctChangeSeries(series, { periods: 7 });
  pctChangeDataFrame(df, { periods: 5 });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  pctChangeSeries(series, { periods: 1 });
  pctChangeSeries(series, { periods: 7 });
  pctChangeDataFrame(df, { periods: 5 });
  times.push(performance.now() - t0);
}

const total_ms = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "pct_change_periods",
    mean_ms: Math.round((total_ms / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total_ms * 1000) / 1000,
  }),
);
