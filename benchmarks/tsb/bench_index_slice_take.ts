/**
 * Benchmark: index_slice_take — Index.slice and Index.take on 100k-element Index
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => i);
const idx = new Index(labels);
const positions = Array.from({ length: 1000 }, (_, i) => i * 100);

for (let i = 0; i < WARMUP; i++) {
  idx.slice(0, 50_000);
  idx.take(positions);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.slice(0, 50_000);
  idx.take(positions);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_slice_take",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
