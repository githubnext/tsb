/**
 * Benchmark: expanding apply with custom function on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 2;
const ITERATIONS = 5;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const s = new Series(data);
const fn = (values: readonly number[]) => {
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
};

for (let i = 0; i < WARMUP; i++) {
  s.expanding().apply(fn);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.expanding().apply(fn);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "expanding_apply",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
