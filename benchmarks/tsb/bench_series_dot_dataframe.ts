/**
 * Benchmark: seriesDotDataFrame and dataFrameDotSeries — cross-form dot products.
 *
 * The existing bench_dot_matmul covers seriesDotSeries and dataFrameDotDataFrame.
 * This benchmark exercises the remaining cross-form variants:
 *   - seriesDotDataFrame(s, df) → Series  (Series × DataFrame matrix multiply)
 *   - dataFrameDotSeries(df, s) → Series  (DataFrame × Series matrix multiply)
 *
 * Mirrors pandas:
 *   - pd.Series.dot(DataFrame) → pd.Series
 *   - pd.DataFrame.dot(Series) → pd.Series
 *
 * Dataset: 1000-element Series, 1000-row × 20-column DataFrame.
 *
 * Outputs JSON: {"function": "series_dot_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, seriesDotDataFrame, dataFrameDotSeries } from "../../src/index.ts";

const N = 1_000;
const K = 20;
const WARMUP = 5;
const ITERATIONS = 50;

// Series with N elements, indexed 0..N-1
const sData = Array.from({ length: N }, (_, i) => (i + 1) * 0.01);
const s = new Series({ data: sData });

// DataFrame: N rows × K columns, indexed 0..N-1, columns "c0".."c19"
const cols: Record<string, number[]> = {};
for (let c = 0; c < K; c++) {
  cols[`c${c}`] = Array.from({ length: N }, (_, i) => (i * K + c) * 0.001);
}
const df = DataFrame.fromColumns(cols);

for (let i = 0; i < WARMUP; i++) {
  seriesDotDataFrame(s, df);
  dataFrameDotSeries(df, s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesDotDataFrame(s, df);
  dataFrameDotSeries(df, s);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_dot_dataframe",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
