/**
 * Benchmark: str_join — str.join on 100k list-of-strings Series values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Series where each element is a list of strings (already split)
const data = Array.from({ length: ROWS }, (_, i) => [`a${i % 10}`, `b${i % 5}`, `c${i % 3}`]);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.join("-");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.join("-");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_join",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
