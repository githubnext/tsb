/**
 * Benchmark: Series-to-Series comparison operations (seriesNe, seriesGt, seriesLe).
 *
 * The existing `compare` benchmark only tests scalar comparison (s.eq(500)).
 * This benchmark tests element-wise comparison between two Series of 100k elements,
 * mirroring pandas s1.ne(s2), s1.gt(s2), s1.le(s2).
 *
 * Outputs JSON: {"function": "series_compare_pair", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, seriesNe, seriesGt, seriesLe, seriesEq } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 100;

const a = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i * 1.7) % 1000) });
const b = new Series({ data: Array.from({ length: SIZE }, (_, i) => (i * 2.3) % 1000) });

for (let i = 0; i < WARMUP; i++) {
  seriesNe(a, b);
  seriesGt(a, b);
  seriesLe(a, b);
  seriesEq(a, b);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesNe(a, b);
  seriesGt(a, b);
  seriesLe(a, b);
  seriesEq(a, b);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_compare_pair",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
