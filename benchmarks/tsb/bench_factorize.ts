/**
 * Benchmark: factorize / seriesFactorize — encode values as integer codes.
 * Outputs JSON: {"function": "factorize", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { factorize, seriesFactorize, Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const categories = ["cat", "dog", "bird", "fish", "hamster"];
const data = Array.from({ length: SIZE }, (_, i) => categories[i % categories.length]);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  factorize(data);
  seriesFactorize(s);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  factorize(data);
  seriesFactorize(s);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "factorize",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
