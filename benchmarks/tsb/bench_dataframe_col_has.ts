/**
 * Benchmark: DataFrame.col(), .has(), .get() on a 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const a = Array.from({ length: ROWS }, (_, i) => i);
const b = Array.from({ length: ROWS }, (_, i) => i * 2.0);
const df = new DataFrame({ columns: { a, b } });

for (let i = 0; i < WARMUP; i++) {
  df.col("a");
  df.has("b");
  df.get("c");
}
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.col("a");
  df.has("b");
  df.get("c");
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "dataframe_col_has",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
