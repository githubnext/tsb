/**
 * Benchmark: filterSeries — filter Series index labels by items/like/regex
 * Outputs JSON: {"function": "filter_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, filterSeries } from "../../src/index.ts";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// Series with string labels: "label_0", "label_1", ..., "label_N-1"
const labels = Array.from({ length: N }, (_, i) => `label_${i}`);
const values = Array.from({ length: N }, (_, i) => i * 0.5);
const s = new Series<number>({ data: values, index: labels });

// Pre-build a set of 1000 items to keep
const keepItems = Array.from({ length: 1_000 }, (_, i) => `label_${i * 100}`);

for (let i = 0; i < WARMUP; i++) {
  filterSeries(s, { items: keepItems });
  filterSeries(s, { like: "label_5" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  filterSeries(s, { items: keepItems });
  filterSeries(s, { like: "label_5" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "filter_series",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
