/**
 * Benchmark: Series.nlargest() — get the n largest values.
 * Outputs JSON: {"function": "nlargest", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i * 1.1 + 0.5) });

for (let i = 0; i < WARMUP; i++) {
  s.nlargest(100);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  s.nlargest(100);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "nlargest",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
