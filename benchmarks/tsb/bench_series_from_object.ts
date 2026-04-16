/**
 * Benchmark: Series.fromObject() on 10k-key object
 */
import { Series } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;
const obj: Record<string, number> = {};
for (let i = 0; i < ROWS; i++) obj[`key_${i}`] = i * 1.5;

for (let i = 0; i < WARMUP; i++) Series.fromObject(obj);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) Series.fromObject(obj);
const total = performance.now() - start;
console.log(
  JSON.stringify({
    function: "series_from_object",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
