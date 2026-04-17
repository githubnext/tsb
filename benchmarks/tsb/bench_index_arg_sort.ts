/**
 * Benchmark: index_arg_sort — Index.argsort on 100k-element Index
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => SIZE - i);
const idx = new Index(labels);

for (let i = 0; i < WARMUP; i++) {
  idx.argsort();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idx.argsort();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_arg_sort",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
