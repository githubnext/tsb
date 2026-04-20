/**
 * Benchmark: seriesToString + dataFrameToString — string representation functions.
 * Outputs JSON: {"function": "series_dataframe_to_string", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, seriesToString, dataFrameToString } from "../../src/index.ts";

const ROWS = 1_000;
const WARMUP = 5;
const ITERATIONS = 100;

const ser = new Series(
  Array.from({ length: ROWS }, (_, i) => i * 3.14159),
  { name: "values" },
);
const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.5),
  b: Array.from({ length: ROWS }, (_, i) => `cat_${i % 20}`),
  c: Array.from({ length: ROWS }, (_, i) => i % 100),
});

for (let i = 0; i < WARMUP; i++) {
  seriesToString(ser);
  seriesToString(ser, { maxRows: 10 });
  dataFrameToString(df, { maxRows: 20 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesToString(ser);
  seriesToString(ser, { maxRows: 10 });
  dataFrameToString(df);
  dataFrameToString(df, { maxRows: 20 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_dataframe_to_string",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
