/**
 * Benchmark: IntegerArray — nullable integer extension array operations.
 * N=100_000 elements with ~10% nulls. Tests from/sum/mean/min/max/add/fillna.
 */
import { arrays } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build input with ~10% nulls
const raw: (number | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : (i % 1000) - 500,
);

for (let i = 0; i < WARMUP; i++) {
  const a = arrays.IntegerArray.from(raw, "Int32");
  a.sum();
  a.mean();
  a.min();
  a.max();
  a.add(1);
  a.fillna(0);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const a = arrays.IntegerArray.from(raw, "Int32");
  a.sum();
  a.mean();
  a.min();
  a.max();
  a.add(1);
  a.fillna(0);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "integer_array",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
