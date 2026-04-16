/**
 * Benchmark: str_startswith_endswith — str.startswith and str.endswith on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `hello_world_${i % 200}_suffix`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.startswith("hello");
  s.str.endswith("suffix");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.startswith("hello");
  s.str.endswith("suffix");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_startswith_endswith",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
