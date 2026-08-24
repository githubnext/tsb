/**
 * Benchmark: str_title — str.title() titlecase conversion on 100k strings.
 * Outputs JSON: {"function": "str_title", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `hello world example ${i % 500} foo bar`);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.str.title();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.str.title();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_title",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
