/**
 * Benchmark: mergeOrdered with fill_method "ffill" — two 5k-row DataFrames with interleaved keys.
 * Outputs JSON: {"function": "merge_ordered_ffill", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, mergeOrdered } from "../../src/index.ts";

const N = 5_000;
const WARMUP = 2;
const ITERATIONS = 8;

// Even-numbered keys on left, multiples-of-3 on right → many gaps filled by ffill
const keys1 = Array.from({ length: N }, (_, i) => i * 2);
const vals1 = Array.from({ length: N }, (_, i) => i * 1.0);
const keys2 = Array.from({ length: N }, (_, i) => i * 3);
const vals2 = Array.from({ length: N }, (_, i) => i * 2.0);

const df1 = DataFrame.fromColumns({ key: keys1, val1: vals1 });
const df2 = DataFrame.fromColumns({ key: keys2, val2: vals2 });

for (let i = 0; i < WARMUP; i++) {
  mergeOrdered(df1, df2, { on: "key", fill_method: "ffill" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mergeOrdered(df1, df2, { on: "key", fill_method: "ffill" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "merge_ordered_ffill",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
