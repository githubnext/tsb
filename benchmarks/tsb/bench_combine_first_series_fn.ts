/**
 * Benchmark: combineFirstSeries (standalone fn) — fill NaN values from another Series (union of indexes).
 * Uses the exported `combineFirstSeries` function rather than the `Series.combineFirst()` method.
 * Mirrors bench_combine_first.ts but exercises the standalone export.
 * Outputs JSON: {"function": "combine_first_series_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, combineFirstSeries } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff) * 10;
  };
};
const rand = rng(42);

const d1: (number | null)[] = Array.from({ length: SIZE }, (_, i) => (i % 4 === 0 ? null : rand()));
const d2 = Array.from({ length: SIZE }, () => rand());
const s1 = new Series(d1);
const s2 = new Series(d2);

for (let i = 0; i < WARMUP; i++) {
  combineFirstSeries(s1, s2);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  combineFirstSeries(s1, s2);
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "combine_first_series_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
