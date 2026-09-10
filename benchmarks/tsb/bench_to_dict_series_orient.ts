/**
 * Benchmark: toDictOriented with "series" orient — converts each DataFrame
 * column to a Series, producing Record<string, Series<Scalar>>.
 *
 * Mirrors pandas DataFrame.to_dict(orient="series") which returns a dict of
 * {column_name: Series} pairs.
 *
 * Outputs JSON: {"function": "to_dict_series_orient", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, toDictOriented } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  id: Array.from({ length: ROWS }, (_, i) => i),
  value: Array.from({ length: ROWS }, (_, i) => i * 1.5),
  label: Array.from({ length: ROWS }, (_, i) => `item_${i % 100}`),
  score: Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) * 100),
  flag: Array.from({ length: ROWS }, (_, i) => i % 2 === 0),
});

for (let i = 0; i < WARMUP; i++) {
  toDictOriented(df, "series");
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toDictOriented(df, "series");
}
const total = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "to_dict_series_orient",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
