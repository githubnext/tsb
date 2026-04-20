/**
 * Benchmark: cumsum / cumprod with skipna=false on 100k-element Series.
 * Outputs JSON: {"function": "cumops_skipna", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, cumsum, cumprod } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

// Series with ~5% NaN values
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 20 === 0 ? null : (i % 100) * 0.001 + 1,
);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  cumsum(s, { skipna: false });
  cumprod(s, { skipna: false });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cumsum(s, { skipna: false });
  cumprod(s, { skipna: false });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "cumops_skipna", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
