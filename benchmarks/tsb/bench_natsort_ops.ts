/**
 * Benchmark: natCompare, natSorted, natArgSort on arrays of filename-like strings.
 * Outputs JSON: {"function": "natsort_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { natCompare, natSorted, natArgSort } from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 20;

const filenames = Array.from({ length: SIZE }, (_, i) => `file${i % 100}_chunk${Math.floor(i / 100)}.txt`);

for (let i = 0; i < WARMUP; i++) {
  natCompare("file10.txt", "file9.txt");
  natSorted(filenames);
  natArgSort(filenames);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  natCompare("file10.txt", "file9.txt");
  natSorted(filenames);
  natArgSort(filenames);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "natsort_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
