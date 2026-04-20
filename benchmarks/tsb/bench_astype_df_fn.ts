/**
 * Benchmark: astype (standalone DataFrame) — exported astype(df, dtype) function on 100k-row DataFrame.
 * Mirrors pandas DataFrame.astype() called via standalone function.
 * Outputs JSON: {"function": "astype_df_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, astype } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.0),
  b: Array.from({ length: SIZE }, (_, i) => i),
  c: Array.from({ length: SIZE }, (_, i) => (i % 2 === 0 ? 1 : 0)),
});

for (let i = 0; i < WARMUP; i++) {
  astype(df, { a: "float32", b: "int32" });
  astype(df, "float64");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  astype(df, { a: "float32", b: "int32" });
  astype(df, "float64");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "astype_df_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
