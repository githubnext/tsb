/**
 * Benchmark: series_at_iat — Series.at(label) and Series.iat(i) point access on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => i * 1.5);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  for (let j = 0; j < 1000; j++) s.iat(j);
  for (let j = 0; j < 1000; j++) s.at(j);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (let j = 0; j < 1000; j++) s.iat(j);
  for (let j = 0; j < 1000; j++) s.at(j);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_at_iat",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
