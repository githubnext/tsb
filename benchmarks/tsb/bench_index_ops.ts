/**
 * Benchmark: Index set operations (union, intersection, difference) on 50k-element Index
 */
import { Index } from "../../src/index.js";

const SIZE = 50_000;
const WARMUP = 3;
const ITERATIONS = 20;

const labelsA = Array.from({ length: SIZE }, (_, i) => i);
const labelsB = Array.from({ length: SIZE }, (_, i) => i + SIZE / 2);
const idxA = new Index(labelsA);
const idxB = new Index(labelsB);

for (let i = 0; i < WARMUP; i++) {
  idxA.union(idxB);
  idxA.intersection(idxB);
  idxA.difference(idxB);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  idxA.union(idxB);
  idxA.intersection(idxB);
  idxA.difference(idxB);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
