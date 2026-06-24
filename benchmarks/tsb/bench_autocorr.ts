/**
 * Benchmark: autoCorr — lag-N autocorrelation for a 100k-element numeric Series.
 *
 * Mirrors pandas Series.autocorr(lag).
 * Benchmarks lag=1, lag=5, and lag=20.
 *
 * Outputs JSON: {"function": "autocorr", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, autoCorr } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// A sinusoidal signal with some noise for a non-trivial autocorrelation.
const data = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.05) + (i % 7) * 0.01);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  autoCorr(s, 1);
  autoCorr(s, 5);
  autoCorr(s, 20);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  autoCorr(s, 1);
  autoCorr(s, 5);
  autoCorr(s, 20);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "autocorr",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
