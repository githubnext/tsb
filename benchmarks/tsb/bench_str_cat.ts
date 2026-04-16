/**
 * Benchmark: str_cat — str.cat concatenating a Series with another array on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `hello_${i % 200}`);
const other = Array.from({ length: ROWS }, (_, i) => `_world_${i % 100}`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.cat([other], "-");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.cat([other], "-");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_cat",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
