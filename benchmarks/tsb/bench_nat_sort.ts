/**
 * Benchmark: natSorted / natCompare / natArgSort — natural sort.
 * Outputs JSON: {"function": "nat_sort", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { natSorted, natCompare, natArgSort } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) => `item${i % 1000}_v${i % 10}`);

for (let i = 0; i < WARMUP; i++) {
  natSorted(data);
  natArgSort(data);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  natSorted(data);
  natArgSort(data);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "nat_sort",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
