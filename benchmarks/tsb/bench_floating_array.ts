/**
 * Benchmark: FloatingArray — nullable float64 extension array operations.
 * N=100_000 elements with ~10% nulls. Tests from/sum/mean/min/max/add/fillna.
 */
import { arrays } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build input with ~10% nulls
const raw: (number | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : (i % 1000) * 0.001 - 0.5,
);

for (let i = 0; i < WARMUP; i++) {
  const a = arrays.FloatingArray.from(raw, "Float64");
  a.sum();
  a.mean();
  a.min();
  a.max();
  a.add(1.0);
  a.fillna(0.0);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const a = arrays.FloatingArray.from(raw, "Float64");
  a.sum();
  a.mean();
  a.min();
  a.max();
  a.add(1.0);
  a.fillna(0.0);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "floating_array",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
