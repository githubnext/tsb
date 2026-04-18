/**
 * Benchmark: interpolateSeries with linear, ffill, bfill, nearest, zero methods.
 * Outputs JSON: {"function": "interpolate_methods", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, interpolateSeries } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Build a series with ~20% NaN scattered
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 5 === 0 ? null : i * 0.1,
);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  interpolateSeries(s, { method: "linear" });
  interpolateSeries(s, { method: "ffill" });
  interpolateSeries(s, { method: "bfill" });
  interpolateSeries(s, { method: "nearest" });
  interpolateSeries(s, { method: "zero" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  interpolateSeries(s, { method: "linear" });
  interpolateSeries(s, { method: "ffill" });
  interpolateSeries(s, { method: "bfill" });
  interpolateSeries(s, { method: "nearest" });
  interpolateSeries(s, { method: "zero" });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "interpolate_methods",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
