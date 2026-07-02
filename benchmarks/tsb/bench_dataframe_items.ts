/**
 * Benchmark: DataFrame.items() / iteritems() — iterate over (columnName, Series) pairs.
 * Outputs JSON: {"function": "dataframe_items", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => i % 500),
  c: Array.from({ length: ROWS }, (_, i) => `cat_${i % 50}`),
  d: Array.from({ length: ROWS }, (_, i) => i * 0.25),
  e: Array.from({ length: ROWS }, (_, i) => i % 2 === 0 ? null : i * 1.5),
  f: Array.from({ length: ROWS }, (_, i) => i * 3),
});

for (let i = 0; i < WARMUP; i++) {
  let n = 0;
  for (const [_name, _col] of df.items()) {
    n++;
  }
  for (const [_name, _col] of df.iteritems()) {
    n++;
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  let n = 0;
  for (const [_name, _col] of df.items()) {
    n++;
  }
  for (const [_name, _col] of df.iteritems()) {
    n++;
  }
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);

console.log(
  JSON.stringify({
    function: "dataframe_items",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
