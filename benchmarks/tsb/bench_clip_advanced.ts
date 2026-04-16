/**
 * Benchmark: clipAdvancedSeries / clipAdvancedDataFrame — per-element clipping with array bounds.
 * Outputs JSON: {"function": "clip_advanced", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, clipAdvancedSeries, clipAdvancedDataFrame } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) * 200);
const lower = Float64Array.from({ length: ROWS }, () => -50);
const upper = Float64Array.from({ length: ROWS }, () => 50);
const s = new Series(data);
const lowerArr = Array.from(lower);
const upperArr = Array.from(upper);

const dfCols: Record<string, number[]> = {};
for (let c = 0; c < 5; c++) {
  dfCols[`col${c}`] = Array.from({ length: ROWS }, (_, i) => Math.sin((i + c) * 0.01) * 200);
}
const df = new DataFrame(dfCols);

for (let i = 0; i < WARMUP; i++) {
  clipAdvancedSeries(s, { lower: lowerArr, upper: upperArr });
  clipAdvancedDataFrame(df, { lower: -50, upper: 50 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  clipAdvancedSeries(s, { lower: lowerArr, upper: upperArr });
  clipAdvancedDataFrame(df, { lower: -50, upper: 50 });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "clip_advanced", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
