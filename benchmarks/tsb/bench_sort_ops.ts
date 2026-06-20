/**
 * Benchmark: sortValuesSeries and sortValuesDataFrame on 100k rows
 */
import { Series, DataFrame, sortValuesSeries, sortValuesDataFrame } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => Math.sin(i) * 1000);
const s = new Series({ data });

const dfData = {
  a: Array.from({ length: ROWS }, (_, i) => Math.sin(i) * 1000),
  b: Array.from({ length: ROWS }, (_, i) => Math.cos(i) * 500),
};
const df = new DataFrame(dfData);

for (let i = 0; i < WARMUP; i++) {
  sortValuesSeries(s);
  sortValuesDataFrame(df, "a");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  sortValuesSeries(s);
  sortValuesDataFrame(df, "a");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "sort_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
