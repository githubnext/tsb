/**
 * Benchmark: combineFirstSeries standalone — exported combineFirstSeries(s1, s2) function.
 * Mirrors pandas Series.combine_first().
 * Outputs JSON: {"function": "combine_first_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, combineFirstSeries } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

// s1: 50k elements with ~30% nulls
const data1 = Array.from({ length: SIZE }, (_, i) => (i % 3 === 0 ? null : i * 1.5));
// s2: 50k elements, fills in the nulls
const data2 = Array.from({ length: SIZE }, (_, i) => i * 2.0);

const s1 = new Series({ data: data1 });
const s2 = new Series({ data: data2 });

for (let i = 0; i < WARMUP; i++) {
  combineFirstSeries(s1, s2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  combineFirstSeries(s1, s2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "combine_first_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
