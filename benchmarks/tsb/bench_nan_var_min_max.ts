/**
 * Benchmark: nanvar / nanmin / nanmax — nan-ignoring aggregates on 100k-element arrays.
 * Outputs JSON: {"function": "nan_var_min_max", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { nanvar, nanmin, nanmax } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Array with ~10% null values
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : (i % 1000) * 0.1 - 50,
);

for (let i = 0; i < WARMUP; i++) {
  nanvar(data);
  nanmin(data);
  nanmax(data);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nanvar(data);
  nanmin(data);
  nanmax(data);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "nan_var_min_max",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
