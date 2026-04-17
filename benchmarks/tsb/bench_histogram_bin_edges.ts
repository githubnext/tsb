/**
 * Benchmark: histogram with custom binEdges option on 100k-element array.
 * Outputs JSON: {"function": "histogram_bin_edges", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { histogram } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) => (i % 1000) * 0.1);

// Custom bin edges: 20 edges covering [0, 100) in equal-width steps of 5
const binEdges: number[] = Array.from({ length: 21 }, (_, i) => i * 5);

for (let i = 0; i < WARMUP; i++) {
  histogram(data, { binEdges });
  histogram(data, { bins: 20 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  histogram(data, { binEdges });
  histogram(data, { bins: 20 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "histogram_bin_edges",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
