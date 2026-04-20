/**
 * Benchmark: nanmedian / nancount / nanprod — additional nan-ignoring aggregates on 100k array.
 * Outputs JSON: {"function": "nancumops_extra", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { nanmedian, nancount, nanprod } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Array with ~10% NaN values
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : Math.sin(i * 0.01) * 100 + 50,
);

for (let i = 0; i < WARMUP; i++) {
  nanmedian(data);
  nancount(data);
  nanprod(data);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nanmedian(data);
  nancount(data);
  nanprod(data);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "nancumops_extra", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
