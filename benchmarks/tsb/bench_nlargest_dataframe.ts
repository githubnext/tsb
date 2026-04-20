/**
 * Benchmark: nlargestDataFrame / nsmallestDataFrame — top-N rows by multiple columns.
 * Outputs JSON: {"function": "nlargest_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, nlargestDataFrame, nsmallestDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const N = 100;
const WARMUP = 5;
const ITERATIONS = 30;

const a = new Series({ data: Float64Array.from({ length: ROWS }, () => Math.random() * 1000) });
const b = new Series({ data: Float64Array.from({ length: ROWS }, () => Math.random() * 500) });
const c = new Series({ data: Float64Array.from({ length: ROWS }, () => Math.random() * 100) });
const df = DataFrame.fromColumns({ a, b, c });

for (let i = 0; i < WARMUP; i++) {
  nlargestDataFrame(df, N, { columns: ["a"] });
  nsmallestDataFrame(df, N, { columns: ["b"] });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  nlargestDataFrame(df, N, { columns: ["a"] });
  nsmallestDataFrame(df, N, { columns: ["b"] });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "nlargest_dataframe",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
