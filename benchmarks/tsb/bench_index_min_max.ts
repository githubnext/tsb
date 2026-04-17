/**
 * Benchmark: index_min_max — Index.min and Index.max on 100k-element Index
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => i);
const idx = new Index(labels);

for (let i = 0; i < WARMUP; i++) {
  idx.min();
  idx.max();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.min();
  idx.max();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_min_max",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
