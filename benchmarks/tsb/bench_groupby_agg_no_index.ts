/**
 * Benchmark: DataFrameGroupBy.agg() with asIndex=false — group key as column.
 * Outputs JSON: {"function": "groupby_agg_no_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

let s = 42;
const rand = () => {
  s = (s * 1664525 + 1013904223) & 0x7fffffff;
  return s / 0x7fffffff;
};

const groups = ["alpha", "beta", "gamma", "delta", "epsilon"];
const df = new DataFrame({
  group: Array.from({ length: SIZE }, () => groups[Math.floor(rand() * 5)]),
  x: Array.from({ length: SIZE }, () => rand() * 100),
  y: Array.from({ length: SIZE }, () => rand() * 50),
});

for (let i = 0; i < WARMUP; i++) {
  df.groupby("group").agg({ x: "mean", y: "sum" }, false);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.groupby("group").agg({ x: "mean", y: "sum" }, false);
  times.push(performance.now() - t0);
}

const total_ms = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "groupby_agg_no_index",
    mean_ms: Math.round((total_ms / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total_ms * 1000) / 1000,
  }),
);
