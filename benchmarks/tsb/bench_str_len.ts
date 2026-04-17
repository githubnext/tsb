/**
 * Benchmark: Series.str.len() on 100k-element string Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => `item_${i}_value`);
const s = new Series({ data, name: "text" });

for (let i = 0; i < WARMUP; i++) s.str.len();
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) s.str.len();
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "str_len",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
