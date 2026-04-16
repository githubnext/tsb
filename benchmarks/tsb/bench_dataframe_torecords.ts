/**
 * Benchmark: dataframe_torecords — DataFrame.toRecords() on a 10k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i),
  b: Array.from({ length: ROWS }, (_, i) => i * 2.0),
  c: Array.from({ length: ROWS }, (_, i) => i % 100),
  d: Array.from({ length: ROWS }, (_, i) => i * 0.5),
  e: Array.from({ length: ROWS }, (_, i) => i % 10),
});

for (let i = 0; i < WARMUP; i++) {
  df.toRecords();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.toRecords();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_torecords",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
