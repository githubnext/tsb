/**
 * Benchmark: index_delete_drop — Index.delete and Index.drop on 100k-element Index
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => i);
const idx = new Index(labels);

for (let i = 0; i < WARMUP; i++) {
  idx.delete(500);
  idx.drop([100, 200, 300, 400, 500]);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.delete(500);
  idx.drop([100, 200, 300, 400, 500]);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_delete_drop",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
