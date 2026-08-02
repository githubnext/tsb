/**
 * Benchmark: clipSeriesWithBounds / clipDataFrameWithBounds — per-element clipping with Series/array bounds.
 * Outputs JSON: {"function": "clip_with_bounds", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, clipSeriesWithBounds, clipDataFrameWithBounds } from "../../src/index.ts";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data = Float64Array.from({ length: ROWS }, (_, i) => (i % 200) - 100);
const lowerArr = Array.from({ length: ROWS }, () => -30);
const upperArr = Array.from({ length: ROWS }, () => 30);
const s = new Series(data);
const lowerSeries = new Series(lowerArr);
const upperSeries = new Series(upperArr);

const dfCols: Record<string, number[]> = {};
for (let c = 0; c < 4; c++) {
  dfCols[`col${c}`] = Array.from({ length: ROWS }, (_, i) => (i + c * 10) % 200 - 100);
}
const df = new DataFrame(dfCols);
const dfLower = new Series(Array.from({ length: ROWS }, () => -30));
const dfUpper = new Series(Array.from({ length: ROWS }, () => 30));

for (let i = 0; i < WARMUP; i++) {
  clipSeriesWithBounds(s, { lower: lowerSeries, upper: upperSeries });
  clipDataFrameWithBounds(df, { lower: dfLower, upper: dfUpper, axis: 0 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  clipSeriesWithBounds(s, { lower: lowerSeries, upper: upperSeries });
  clipDataFrameWithBounds(df, { lower: dfLower, upper: dfUpper, axis: 0 });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "clip_with_bounds", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
