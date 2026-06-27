/**
 * Benchmark: crossJoin — Cartesian product of two 300-row DataFrames (90k result rows).
 * Outputs JSON: {"function": "cross_join", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, crossJoin } from "../../src/index.ts";

const N = 300;
const WARMUP = 3;
const ITERATIONS = 10;

// Distinct column names so no suffix needed
const left = DataFrame.fromColumns({
  id_a: Array.from({ length: N }, (_, i) => i),
  val_a: Array.from({ length: N }, (_, i) => i * 1.5),
});
const right = DataFrame.fromColumns({
  id_b: Array.from({ length: N }, (_, i) => i),
  val_b: Array.from({ length: N }, (_, i) => i * 2.5),
});

for (let i = 0; i < WARMUP; i++) {
  crossJoin(left, right);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  crossJoin(left, right);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cross_join",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
