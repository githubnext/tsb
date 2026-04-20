/**
 * Benchmark: dropna with thresh and subset options on a DataFrame.
 * Outputs JSON: {"function": "dropna_thresh_subset", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dropnaDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i * 1.0)),
  b: Array.from({ length: SIZE }, (_, i) => (i % 7 === 0 ? null : i * 2.0)),
  c: Array.from({ length: SIZE }, (_, i) => (i % 11 === 0 ? null : i * 3.0)),
  d: Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : `label_${i % 20}`)),
});

for (let i = 0; i < WARMUP; i++) {
  dropnaDataFrame(df, { how: "any" });
  dropnaDataFrame(df, { how: "all" });
  dropnaDataFrame(df, { thresh: 3 });
  dropnaDataFrame(df, { subset: ["a", "b"] });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dropnaDataFrame(df, { how: "any" });
  dropnaDataFrame(df, { how: "all" });
  dropnaDataFrame(df, { thresh: 3 });
  dropnaDataFrame(df, { subset: ["a", "b"] });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dropna_thresh_subset",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
