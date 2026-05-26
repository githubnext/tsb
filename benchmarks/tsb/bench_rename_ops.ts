/**
 * Benchmark: rename_ops — renameSeriesIndex / renameDataFrame / addPrefixDataFrame / addSuffixDataFrame on 100k rows.
 * Outputs JSON: {"function": "rename_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, renameSeriesIndex, renameDataFrame, addPrefixDataFrame, addSuffixDataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const s = new Series({ data: Array.from({ length: SIZE }, (_, i) => i), index: Array.from({ length: SIZE }, (_, i) => `row_${i}`) });
const df = DataFrame.fromColumns({
  col_a: Array.from({ length: SIZE }, (_, i) => i),
  col_b: Array.from({ length: SIZE }, (_, i) => i * 2),
  col_c: Array.from({ length: SIZE }, (_, i) => i * 3),
});

for (let i = 0; i < WARMUP; i++) {
  renameSeriesIndex(s, (lbl) => `new_${String(lbl)}`);
  renameDataFrame(df, { columns: { col_a: "a", col_b: "b" } });
  addPrefixDataFrame(df, "pre_");
  addSuffixDataFrame(df, "_suf");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  renameSeriesIndex(s, (lbl) => `new_${String(lbl)}`);
  renameDataFrame(df, { columns: { col_a: "a", col_b: "b" } });
  addPrefixDataFrame(df, "pre_");
  addSuffixDataFrame(df, "_suf");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "rename_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
