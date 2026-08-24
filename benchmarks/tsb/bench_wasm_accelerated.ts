/**
 * Benchmark: searchsortedAccelerated / searchsortedManyAccelerated / argsortScalarsAccelerated
 * — the WASM-backed dispatch wrappers (fall back to pure TS when WASM is not loaded).
 *
 * Mirrors numpy.searchsorted / numpy.searchsorted (array) / numpy.argsort on a
 * 100k-element float64 dataset.
 *
 * Outputs JSON: {"function": "wasm_accelerated", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  searchsortedAccelerated,
  searchsortedManyAccelerated,
  argsortScalarsAccelerated,
} from "../../src/wasm/index.ts";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const arr: number[] = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.001) * SIZE);
const sorted: number[] = [...arr].sort((a, b) => a - b);
const queries: number[] = Array.from({ length: 1_000 }, (_, i) => (i - 500) * (SIZE / 500));

for (let i = 0; i < WARMUP; i++) {
  searchsortedAccelerated(sorted, queries[0] ?? 0, "left");
  searchsortedManyAccelerated(sorted, queries, "left");
  argsortScalarsAccelerated(arr);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  searchsortedAccelerated(sorted, queries[0] ?? 0, "left");
  searchsortedManyAccelerated(sorted, queries, "left");
  argsortScalarsAccelerated(arr);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "wasm_accelerated",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
