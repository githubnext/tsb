/**
 * Benchmark: dataframe_fromrecords — DataFrame.fromRecords(records) on 10k records with 5 columns
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const records = Array.from({ length: ROWS }, (_, i) => ({
  a: i,
  b: i * 2.0,
  c: i % 100,
  d: i * 0.5,
  e: i % 10,
}));

for (let i = 0; i < WARMUP; i++) {
  DataFrame.fromRecords(records);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  DataFrame.fromRecords(records);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_fromrecords",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
