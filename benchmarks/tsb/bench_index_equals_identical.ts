/**
 * Benchmark: index_equals_identical — Index.equals and Index.identical on 100k-element Index
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => i);
const idx = new Index(labels);
const idx2 = new Index(labels.slice());

for (let i = 0; i < WARMUP; i++) {
  idx.equals(idx2);
  idx.identical(idx2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.equals(idx2);
  idx.identical(idx2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_equals_identical",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
