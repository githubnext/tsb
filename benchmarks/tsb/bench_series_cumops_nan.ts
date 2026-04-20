/**
 * Benchmark: cumsum / cumprod / cummax / cummin on 100k-element Series with NaN values (skipna=true).
 * Outputs JSON: {"function": "series_cumops_nan", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, cumsum, cumprod, cummax, cummin } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

// ~10% NaN values
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 10 === 0 ? null : Math.sin(i * 0.01) * 50 + 100,
);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  cumsum(s);
  cumprod(s);
  cummax(s);
  cummin(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cumsum(s);
  cumprod(s);
  cummax(s);
  cummin(s);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "series_cumops_nan", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
