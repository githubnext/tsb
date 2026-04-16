/**
 * Benchmark: DataFrame.from2D and DataFrame.select
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data2D = Array.from({ length: ROWS }, (_, i) => [i * 1.0, i * 2.0, i * 3.0]);
const cols = ["a", "b", "c"];
let df = DataFrame.from2D(data2D, cols);

for (let i = 0; i < WARMUP; i++) {
  DataFrame.from2D(data2D, cols);
  df.select(["a", "c"]);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  DataFrame.from2D(data2D, cols);
  df.select(["a", "c"]);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_from2d_select",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
