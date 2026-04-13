/**
 * Benchmark: pearsonCorr — Pearson correlation between two 100k-element Series
 */
import { Series, pearsonCorr } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const x = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const y = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01 + 0.5));
const sx = new Series(x);
const sy = new Series(y);

for (let i = 0; i < WARMUP; i++) {
  pearsonCorr(sx, sy);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pearsonCorr(sx, sy);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pearson_corr",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
