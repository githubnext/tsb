/**
 * Benchmark: str_pad — str.pad, str.ljust, str.rjust, str.zfill on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `hello_${i % 200}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.pad(20);
  s.str.ljust(20);
  s.str.rjust(20);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.pad(20);
  s.str.ljust(20);
  s.str.rjust(20);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_pad",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
