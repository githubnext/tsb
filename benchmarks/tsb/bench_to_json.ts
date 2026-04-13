/**
 * Benchmark: toJson — serialize a 10k-row DataFrame to JSON
 */
import { DataFrame, toJson } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Float64Array.from({ length: ROWS }, (_, i) => i * 1.5);
const b = Float64Array.from({ length: ROWS }, (_, i) => i * 2.5);
const df = new DataFrame({ a, b });

for (let i = 0; i < WARMUP; i++) {
  toJson(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toJson(df);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "to_json",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
