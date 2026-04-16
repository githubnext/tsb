/**
 * Benchmark: series_setindex — Series.setIndex(index) on a 100k-element Series
 */
import { Index, Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => i * 1.5);
const s = new Series(data);
const newIndex = new Index(Array.from({ length: ROWS }, (_, i) => `key${i}`));

for (let i = 0; i < WARMUP; i++) {
  s.setIndex(newIndex);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.setIndex(newIndex);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_setindex",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
