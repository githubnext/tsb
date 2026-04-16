/**
 * Benchmark: index_getindexer — Index.getIndexer(target) on 10k-element Index
 */
import { Series } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const base = new Series(Float64Array.from({ length: ROWS }, (_, i) => i));
const target = new Series(Float64Array.from({ length: 1000 }, (_, i) => i * 10));

for (let i = 0; i < WARMUP; i++) {
  base.index.getIndexer(target.index);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  base.index.getIndexer(target.index);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_getindexer",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
