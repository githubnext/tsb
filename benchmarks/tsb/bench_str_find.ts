/**
 * Benchmark: str_find — str.find and str.rfind on 100k strings
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `hello_world_${i % 200}_end`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.find("world");
  s.str.rfind("_");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.find("world");
  s.str.rfind("_");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_find",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
