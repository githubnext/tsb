/**
 * Benchmark: index_drop_duplicates — Index.dropDuplicates on 100k Index with 50% dupes
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => i % (SIZE / 2));
const idx = new Index(labels);

for (let i = 0; i < WARMUP; i++) {
  idx.dropDuplicates();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.dropDuplicates();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_drop_duplicates",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
