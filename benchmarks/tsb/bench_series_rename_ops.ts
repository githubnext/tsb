/**
 * Benchmark: addPrefixSeries / addSuffixSeries / setAxisSeries / setAxisDataFrame / seriesToFrame
 * — Series and DataFrame label-rename helpers on 100k-element inputs.
 *
 * Mirrors pandas Series.add_prefix, add_suffix, set_axis, DataFrame.set_axis, Series.to_frame.
 *
 * Outputs JSON: {"function": "series_rename_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  DataFrame,
  addPrefixSeries,
  addSuffixSeries,
  setAxisSeries,
  setAxisDataFrame,
  seriesToFrame,
} from "../../src/index.js";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Array.from({ length: SIZE }, (_, i) => i * 0.5);
const labels = Array.from({ length: SIZE }, (_, i) => `row_${i}`);
const newLabels = Array.from({ length: SIZE }, (_, i) => `new_${i}`);

const s = new Series({ data, index: labels, name: "values" });
const df = DataFrame.fromColumns({
  a: data,
  b: data.map((v) => -v),
});

for (let i = 0; i < WARMUP; i++) {
  addPrefixSeries(s, "pre_");
  addSuffixSeries(s, "_suf");
  setAxisSeries(s, newLabels);
  setAxisDataFrame(df, newLabels);
  seriesToFrame(s);
  seriesToFrame(s, "renamed");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  addPrefixSeries(s, "pre_");
  addSuffixSeries(s, "_suf");
  setAxisSeries(s, newLabels);
  setAxisDataFrame(df, newLabels);
  seriesToFrame(s);
  seriesToFrame(s, "renamed");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_rename_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
