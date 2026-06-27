/**
 * Benchmark: itemSeries / boolSeries / boolDataFrame — single-element scalar extraction.
 *
 * Covers functions in scalar_extract.ts not benchmarked by bench_scalar_extract
 * (which benchmarks squeeze, firstValidIndex, lastValidIndex but not item/bool).
 *
 * Mirrors pandas:
 *   - Series.item()              → itemSeries
 *   - bool(pd.Series([True]))    → boolSeries
 *   - bool(pd.DataFrame([[1]])) → boolDataFrame
 *
 * Single-element objects are created once outside the loop; the hot path is
 * the repeated extraction call itself.
 *
 * Outputs JSON: {"function": "item_bool_extract", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, itemSeries, boolSeries, boolDataFrame } from "../../src/index.ts";

const WARMUP = 20;
const ITERATIONS = 100_000;

// Single-element Series / DataFrames (reused each iteration).
const numericSeries = new Series({ data: [42.5] });
const trueSeries = new Series({ data: [true] });
const trueDF = DataFrame.fromColumns({ x: [true] });

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  itemSeries(numericSeries);
  boolSeries(trueSeries);
  boolDataFrame(trueDF);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  itemSeries(numericSeries);
  boolSeries(trueSeries);
  boolDataFrame(trueDF);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "item_bool_extract",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
