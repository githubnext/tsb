/**
 * Benchmark: RangeIndex construction, toArray(), slice(), contains()
 */
import { RangeIndex } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

for (let i = 0; i < WARMUP; i++) {
  const r = new RangeIndex(N);
  r.toArray();
  r.slice(1000, 5000);
  r.contains(50_000);
}
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const r = new RangeIndex(N);
  r.toArray();
  r.slice(1000, 5000);
  r.contains(50_000);
}
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "range_index",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
