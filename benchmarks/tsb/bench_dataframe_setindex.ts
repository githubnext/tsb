/**
 * Benchmark: dataframe_setindex — DataFrame.setIndex(col) on a 10k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = DataFrame.fromColumns({
  id: Array.from({ length: ROWS }, (_, i) => i),
  a: Array.from({ length: ROWS }, (_, i) => i * 2.0),
  b: Array.from({ length: ROWS }, (_, i) => i % 100),
});

for (let i = 0; i < WARMUP; i++) {
  df.setIndex("id");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.setIndex("id");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_setindex",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
