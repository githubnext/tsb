/**
 * Benchmark: index_isna_dropna — Index.isna and Index.dropna on 100k-element Index with nulls
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => (i % 5 === 0 ? null : i));
const idx = new Index(labels);

for (let i = 0; i < WARMUP; i++) {
  idx.isna();
  idx.dropna();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.isna();
  idx.dropna();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_isna_dropna",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
