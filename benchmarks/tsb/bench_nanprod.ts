/**
 * Benchmark: nanprod() — product of array values, ignoring NaN/null.
 * Outputs JSON: {"function": "nanprod", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { nanprod } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) =>
  i % 13 === 0 ? null : 1 + (i % 7) * 0.0001,
);

for (let i = 0; i < WARMUP; i++) {
  nanprod(data);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  nanprod(data);
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "nanprod",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
