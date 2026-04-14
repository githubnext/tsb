/**
 * Benchmark: SeriesGroupBy.transform on 100k Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => (i * 1.5) % 9999);
const by = new Series({ data: Array.from({ length: ROWS }, (_, i) => i % 50) });
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.groupby(by).transform((vals) => {
    const m = (vals as number[]).reduce((a, b) => a + b, 0) / vals.length;
    return (vals as number[]).map((v) => v - m);
  });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.groupby(by).transform((vals) => {
    const m = (vals as number[]).reduce((a, b) => a + b, 0) / vals.length;
    return (vals as number[]).map((v) => v - m);
  });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_groupby_transform",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
