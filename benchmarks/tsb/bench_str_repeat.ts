/**
 * Benchmark: str_repeat — str.repeat on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `ab_${i % 100}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.repeat(3);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.repeat(3);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_repeat",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
