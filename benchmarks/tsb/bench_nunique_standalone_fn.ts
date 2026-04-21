/**
 * Benchmark: nunique standalone — count unique values in DataFrame with nunique().
 * Outputs JSON: {"function": "nunique_standalone_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, nunique } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i % 1_000),
  b: Array.from({ length: ROWS }, (_, i) => `cat_${i % 200}`),
  c: Array.from({ length: ROWS }, (_, i) => i % 50),
  d: Array.from({ length: ROWS }, (_, i) => (i % 5 === 0 ? null : i % 100)),
});

for (let i = 0; i < WARMUP; i++) {
  nunique(df);
  nunique(df, { axis: 1 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  nunique(df);
  nunique(df, { dropna: false });
  nunique(df, { axis: 1 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "nunique_standalone_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
