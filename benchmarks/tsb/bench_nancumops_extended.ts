/**
 * Benchmark: nanprod / nanmedian / nancount — nan-ignoring aggregates on a 100k-element array.
 * Outputs JSON: {"function": "nancumops_extended", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { nanprod, nanmedian, nancount } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Array with ~10% null values; small floats to keep product finite
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : 1.0 + Math.sin(i * 0.001) * 0.001,
);

for (let i = 0; i < WARMUP; i++) {
  nanprod(data);
  nanmedian(data);
  nancount(data);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nanprod(data);
  nanmedian(data);
  nancount(data);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "nancumops_extended",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
