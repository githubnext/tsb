/**
 * Benchmark: Series.withValues() on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;
const data = Array.from({ length: ROWS }, (_, i) => i * 1.0);
const newData = Array.from({ length: ROWS }, (_, i) => i * 2.0);
const s = new Series({ data, name: "x" });

for (let i = 0; i < WARMUP; i++) s.withValues(newData);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) s.withValues(newData);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "series_with_values",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
