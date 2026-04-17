/**
 * Benchmark: DataFrameEwm std and var on 100k-row DataFrame
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.05));
const b = Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.05));
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  df.ewm({ span: 20 }).std();
  df.ewm({ span: 20 }).var();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.ewm({ span: 20 }).std();
  df.ewm({ span: 20 }).var();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_ewm_std_var",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
