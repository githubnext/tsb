/**
 * Benchmark: index_insert — Index.insert on 100k-element Index
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => i);
const idx = new Index(labels);

for (let i = 0; i < WARMUP; i++) {
  idx.insert(500, 999_999);
  idx.insert(0, -1);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.insert(500, 999_999);
  idx.insert(0, -1);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_insert",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
