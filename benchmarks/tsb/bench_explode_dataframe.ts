/**
 * Benchmark: explodeDataFrame — explode list-column into rows.
 * Outputs JSON: {"function": "explode_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, explodeDataFrame } from "../../src/index.ts";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Each row has a list of 3-5 elements in column "vals"
const vals = Array.from({ length: ROWS }, (_, i) => [i, i + 1, i + 2]);
const labels = Array.from({ length: ROWS }, (_, i) => `cat_${i % 100}`);
const df = DataFrame.fromColumns({ vals, labels });

for (let i = 0; i < WARMUP; i++) {
  explodeDataFrame(df, "vals");
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  explodeDataFrame(df, "vals");
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "explode_dataframe",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
