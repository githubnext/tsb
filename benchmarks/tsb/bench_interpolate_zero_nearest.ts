/**
 * Benchmark: interpolateSeries with zero and nearest methods.
 * Outputs JSON: {"function": "interpolate_zero_nearest", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, interpolateSeries } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

// ~15% null values with consecutive gaps
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) => {
  const mod = i % 7;
  if (mod === 0 || mod === 1 || mod === 2) return null;
  return Math.sin(i * 0.01) * 100;
});
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  interpolateSeries(s, { method: "zero" });
  interpolateSeries(s, { method: "nearest" });
  interpolateSeries(s, { method: "linear", limit: 2 });
  interpolateSeries(s, { method: "ffill", limit: 5 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  interpolateSeries(s, { method: "zero" });
  interpolateSeries(s, { method: "nearest" });
  interpolateSeries(s, { method: "linear", limit: 2 });
  interpolateSeries(s, { method: "ffill", limit: 5 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "interpolate_zero_nearest",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
