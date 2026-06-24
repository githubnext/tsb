/**
 * Benchmark: seriesToFrame / setAxisSeries / setAxisDataFrame / addPrefixSeries / addSuffixSeries
 *
 * Covers rename_ops functions not benchmarked by bench_rename_ops (which only benchmarks
 * renameSeriesIndex, renameDataFrame, addPrefixDataFrame, addSuffixDataFrame).
 *
 * Mirrors pandas:
 *   - Series.to_frame()          → seriesToFrame
 *   - Series.set_axis(labels)    → setAxisSeries
 *   - DataFrame.set_axis(labels) → setAxisDataFrame
 *   - Series.add_prefix(prefix)  → addPrefixSeries
 *   - Series.add_suffix(suffix)  → addSuffixSeries
 *
 * Dataset: 50 000-element numeric Series; 50 000-row × 3-column DataFrame.
 *
 * Outputs JSON: {"function": "series_setaxis_toframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  DataFrame,
  seriesToFrame,
  setAxisSeries,
  setAxisDataFrame,
  addPrefixSeries,
  addSuffixSeries,
} from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const data = Array.from({ length: SIZE }, (_, i) => i * 1.5);
const idx = Array.from({ length: SIZE }, (_, i) => `r${i}`);
const newIdx = Array.from({ length: SIZE }, (_, i) => `row_${i}`);

const s = new Series({ data, index: idx, name: "values" });
const df = DataFrame.fromColumns(
  {
    a: Array.from({ length: SIZE }, (_, i) => i),
    b: Array.from({ length: SIZE }, (_, i) => i * 2),
    c: Array.from({ length: SIZE }, (_, i) => i * 3),
  },
  { index: idx },
);
const newCols = ["col_a", "col_b", "col_c"];

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  seriesToFrame(s);
  setAxisSeries(s, newIdx);
  setAxisDataFrame(df, newIdx, 0);
  setAxisDataFrame(df, newCols, 1);
  addPrefixSeries(s, "pre_");
  addSuffixSeries(s, "_suf");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesToFrame(s);
  setAxisSeries(s, newIdx);
  setAxisDataFrame(df, newIdx, 0);
  setAxisDataFrame(df, newCols, 1);
  addPrefixSeries(s, "pre_");
  addSuffixSeries(s, "_suf");
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_setaxis_toframe",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
