/**
 * Benchmark: Index.contains and isin on 100k-element Index
 */
import { Index } from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labels = Array.from({ length: SIZE }, (_, i) => i);
const idx = new Index(labels);
const lookups = Array.from({ length: 1000 }, (_, i) => i * 100);

for (let i = 0; i < WARMUP; i++) {
  for (const lbl of lookups.slice(0, 10)) idx.contains(lbl);
  idx.isin(lookups);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const lbl of lookups.slice(0, 10)) idx.contains(lbl);
  idx.isin(lookups);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_contains",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
