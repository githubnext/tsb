/**
 * Benchmark: str_is_alpha_digit — str.isalpha and str.isdigit on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i % 2 === 0 ? `hello` : `12345`));
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.isalpha();
  s.str.isdigit();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.isalpha();
  s.str.isdigit();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_is_alpha_digit",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
