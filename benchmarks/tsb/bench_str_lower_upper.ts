/**
 * Benchmark: str_lower_upper — str.lower and str.upper on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `Hello_World_${i % 200}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.lower();
  s.str.upper();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.lower();
  s.str.upper();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_lower_upper",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
