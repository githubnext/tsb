/**
 * Benchmark: countna — count NaN/null values in a Series with 10% nulls
 */
import { Series } from "../../src/index.js";
import { countna } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => (i % 10 === 0 ? null : i));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  countna(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  countna(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "countna",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
