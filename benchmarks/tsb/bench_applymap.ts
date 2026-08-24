/**
 * Benchmark: applymap — element-wise function applied to every cell of a DataFrame.
 * Mirrors pandas DataFrame.map (formerly DataFrame.applymap).
 * Dataset: 50,000 rows × 4 columns of float64.
 */
import { DataFrame, applymap } from "../../src/index.js";
import type { Scalar } from "../../src/types.js";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = new DataFrame({
  a: Array.from({ length: ROWS }, (_, i) => i * 0.5),
  b: Array.from({ length: ROWS }, (_, i) => i * 1.1),
  c: Array.from({ length: ROWS }, (_, i) => i * 2.3),
  d: Array.from({ length: ROWS }, (_, i) => i * 0.7),
});

const fn = (v: Scalar): Scalar => (v as number) * 2.0 + 1.0;

for (let i = 0; i < WARMUP; i++) {
  applymap(df, fn);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  applymap(df, fn);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "applymap",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
