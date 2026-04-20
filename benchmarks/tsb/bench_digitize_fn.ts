/**
 * Benchmark: digitize (standalone) — bin 50k values into 10 bins.
 * Outputs JSON: {"function": "digitize_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { digitize } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const values: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 20 === 0 ? null : (i % 100) * 0.1,
);
const bins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

for (let i = 0; i < WARMUP; i++) {
  digitize(values, bins);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  digitize(values, bins);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "digitize_fn",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
