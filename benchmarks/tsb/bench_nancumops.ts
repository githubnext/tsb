/**
 * Benchmark: nansum / nanmean / nanvar / nanstd — nan-ignoring aggregates on a 100k-element array.
 * Outputs JSON: {"function": "nancumops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { nansum, nanmean, nanvar, nanstd, nanmin, nanmax } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Array with ~10% NaN values
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : Math.sin(i * 0.01) * 100,
);

for (let i = 0; i < WARMUP; i++) {
  nansum(data);
  nanmean(data);
  nanvar(data);
  nanstd(data);
  nanmin(data);
  nanmax(data);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nansum(data);
  nanmean(data);
  nanvar(data);
  nanstd(data);
  nanmin(data);
  nanmax(data);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "nancumops", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
