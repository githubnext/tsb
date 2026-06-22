/**
 * Benchmark: dataFrameTransform with named aggregation strings.
 *
 * Mirrors pandas DataFrame.transform(["sum", "mean", "cumsum"]) which applies
 * multiple aggregation functions per column. Tests the string-name form of
 * dataFrameTransform from stats/transform_agg.ts.
 *
 * Outputs JSON: {"function": "dataframe_transform_named", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameTransform } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

const a = Array.from({ length: ROWS }, (_, i) => (i % 100) * 1.5 + 1);
const b = Array.from({ length: ROWS }, (_, i) => ((i * 3) % 200) * 0.5 + 2);
const c = Array.from({ length: ROWS }, (_, i) => ((i * 7) % 50) * 2.0 + 0.5);
const df = DataFrame.fromColumns({ a, b, c });

// Warm-up: single-string transform and array-of-strings transform
for (let i = 0; i < WARMUP; i++) {
  dataFrameTransform(df, "mean");
  dataFrameTransform(df, "cumsum");
  dataFrameTransform(df, ["sum", "mean"] as const);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameTransform(df, "mean");
  dataFrameTransform(df, "cumsum");
  dataFrameTransform(df, ["sum", "mean"] as const);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_transform_named",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
