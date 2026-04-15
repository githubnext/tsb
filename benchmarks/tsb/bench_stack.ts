/**
 * Benchmark: stack — stack(df) converts a wide DataFrame to a long Series on a 1000x10 DataFrame
 */
import { DataFrame, stack } from "../../src/index.js";

const ROWS = 1_000;
const COLS = 10;
const WARMUP = 5;
const ITERATIONS = 50;

const colData: Record<string, number[]> = {};
for (let c = 0; c < COLS; c++) {
  colData[`col${c}`] = Array.from({ length: ROWS }, (_, i) => i * COLS + c);
}
const df = DataFrame.fromColumns(colData);

for (let i = 0; i < WARMUP; i++) {
  stack(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  stack(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "stack",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
