/**
 * Benchmark: MultiIndex set operations (union, intersection, difference)
 */
import { MultiIndex } from "../../src/index.js";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a1 = Array.from({ length: ROWS }, (_, i) => `a${i % 100}`);
const b1 = Array.from({ length: ROWS }, (_, i) => i % 1000);
const tuples1: [string, number][] = a1.map((v, i) => [v, b1[i]]);

const a2 = Array.from({ length: ROWS }, (_, i) => `a${(i + 50) % 100}`);
const b2 = Array.from({ length: ROWS }, (_, i) => (i + 500) % 1000);
const tuples2: [string, number][] = a2.map((v, i) => [v, b2[i]]);

const mi1 = new MultiIndex({ tuples: tuples1 });
const mi2 = new MultiIndex({ tuples: tuples2 });

for (let i = 0; i < WARMUP; i++) {
  mi1.union(mi2);
  mi1.intersection(mi2);
  mi1.difference(mi2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mi1.union(mi2);
  mi1.intersection(mi2);
  mi1.difference(mi2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "multi_index_setops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
