/**
 * Benchmark: nansum / nanmean / nanstd — nan-ignoring aggregates on 100k-element arrays.
 * Outputs JSON: {"function": "nan_sum_mean_std", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { nansum, nanmean, nanstd } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Array with ~10% null values
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : Math.sin(i * 0.01) * 100 + 50,
);

for (let i = 0; i < WARMUP; i++) {
  nansum(data);
  nanmean(data);
  nanstd(data);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nansum(data);
  nanmean(data);
  nanstd(data);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "nan_sum_mean_std",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
