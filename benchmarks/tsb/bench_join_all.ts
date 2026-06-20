/**
 * Benchmark: joinAll — sequential left-join of 4 DataFrames each with 5k rows.
 * Outputs JSON: {"function": "join_all", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, joinAll } from "../../src/index.ts";

const N = 5_000;
const WARMUP = 3;
const ITERATIONS = 10;

const idx = Array.from({ length: N }, (_, i) => String(i));

// Base DataFrame and three others — distinct column names, shared index
const base = DataFrame.fromColumns({ a: Array.from({ length: N }, (_, i) => i) }, { index: idx });
const df1 = DataFrame.fromColumns({ b: Array.from({ length: N }, (_, i) => i * 2) }, { index: idx });
const df2 = DataFrame.fromColumns({ c: Array.from({ length: N }, (_, i) => i * 3) }, { index: idx });
const df3 = DataFrame.fromColumns({ d: Array.from({ length: N }, (_, i) => i * 4) }, { index: idx });

for (let i = 0; i < WARMUP; i++) {
  joinAll(base, [df1, df2, df3]);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  joinAll(base, [df1, df2, df3]);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "join_all",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
