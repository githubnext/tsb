/**
 * Benchmark: natCompareAccelerated / natSortedAccelerated / natArgSortAccelerated
 * — WASM-backed natural-sort dispatch wrappers (fall back to pure TS when WASM is not loaded).
 *
 * Mirrors Python `natsort` package: natSorted / natArgSort on 10k strings.
 * Outputs JSON: {"function": "wasm_natsort", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  natCompareAccelerated,
  natSortedAccelerated,
  natArgSortAccelerated,
} from "../../src/wasm/index.ts";

const N = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Generate strings with embedded numbers so natsort ordering differs from lexicographic
const arr: string[] = Array.from(
  { length: N },
  (_, i) => `file${Math.floor(Math.random() * N)}_v${i % 100}.txt`,
);

for (let i = 0; i < WARMUP; i++) {
  natCompareAccelerated("file10.txt", "file9.txt");
  natSortedAccelerated(arr);
  natArgSortAccelerated(arr);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  natCompareAccelerated("file10.txt", "file9.txt");
  natSortedAccelerated(arr);
  natArgSortAccelerated(arr);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "wasm_natsort",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
