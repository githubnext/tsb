/**
 * Benchmark: index_argmin_argmax — Index.argmin and Index.argmax on 100k-element Index
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => i);
const idx = new Index(labels);

for (let i = 0; i < WARMUP; i++) {
  idx.argmin();
  idx.argmax();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.argmin();
  idx.argmax();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_argmin_argmax",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
