/**
 * Benchmark: Series floordiv, mod, and pow operators on 100k Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => (i + 1) * 0.5);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.floordiv(3);
  s.mod(7);
  s.pow(2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.floordiv(3);
  s.mod(7);
  s.pow(2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_floordiv_mod_pow",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
