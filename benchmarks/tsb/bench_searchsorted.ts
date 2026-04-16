/**
 * Benchmark: searchsorted / searchsortedMany — binary search on sorted arrays.
 * Outputs JSON: {"function": "searchsorted", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { searchsorted, searchsortedMany } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const sorted = Array.from({ length: SIZE }, (_, i) => i * 2); // even numbers 0..199998
const needles = Array.from({ length: 1_000 }, (_, i) => i * 200);

for (let i = 0; i < WARMUP; i++) {
  searchsorted(sorted, 50_000);
  searchsortedMany(sorted, needles);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  searchsorted(sorted, 50_000);
  searchsortedMany(sorted, needles);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "searchsorted",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
