/**
 * Benchmark: sortIndexSeries — sort a Series by its index labels.
 *
 * Mirrors `pandas.Series.sort_index()`.
 * N=100_000 elements with shuffled string and numeric index labels.
 * Outputs JSON: {"function": "sort_index_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, sortIndexSeries } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Numeric series with shuffled index labels
const numericData = Array.from({ length: N }, (_, i) => Math.sin(i) * 1000);
const shuffledIndex = Array.from({ length: N }, (_, i) => N - 1 - i);
const sNumeric = new Series({ data: numericData, index: shuffledIndex });

// String-indexed series
const stringIndex = Array.from({ length: N }, (_, i) => `key_${(N - 1 - i).toString().padStart(6, "0")}`);
const sString = new Series({ data: numericData, index: stringIndex });

for (let i = 0; i < WARMUP; i++) {
  sortIndexSeries(sNumeric);
  sortIndexSeries(sNumeric, { ascending: false });
  sortIndexSeries(sString);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  sortIndexSeries(sNumeric);
  sortIndexSeries(sNumeric, { ascending: false });
  sortIndexSeries(sString);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "sort_index_series",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
