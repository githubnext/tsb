/**
 * Benchmark: Index set operations — union, intersection, difference on 10k-element indexes.
 *
 * Mirrors `pandas.Index.union()`, `.intersection()`, and `.difference()`.
 *
 * Dataset: two 10 000-element integer indexes with 50% overlap.
 * Outputs JSON: {"function": "index_setops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Index } from "../../src/index.js";

const N = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

// a = [0..9999], b = [5000..14999] — 5000-element overlap
const a = new Index(Array.from({ length: N }, (_, i) => i));
const b = new Index(Array.from({ length: N }, (_, i) => i + N / 2));

function run(): void {
  a.union(b);
  a.intersection(b);
  a.difference(b);
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "index_setops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
