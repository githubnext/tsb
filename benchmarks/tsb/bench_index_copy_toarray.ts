/**
 * Benchmark: Index copy and toArray on 100k-element Index
 */
import { Index } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const values = Array.from({ length: ROWS }, (_, i) => i);
const idx = new Index(values);

for (let i = 0; i < WARMUP; i++) {
  idx.copy();
  idx.toArray();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.copy();
  idx.toArray();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_copy_toarray",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
