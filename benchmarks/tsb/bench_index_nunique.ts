/**
 * Benchmark: index_nunique — Index.nunique on 100k-element Index with 50% unique values
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => i % (SIZE / 2));
const idx = new Index(labels);

for (let i = 0; i < WARMUP; i++) {
  idx.nunique();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.nunique();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_nunique",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
