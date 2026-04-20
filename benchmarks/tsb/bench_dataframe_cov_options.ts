/**
 * Benchmark: dataFrameCov / dataFrameCorr with options (ddof, minPeriods).
 * Outputs JSON: {"function": "dataframe_cov_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameCov, dataFrameCorr } from "../../src/index.ts";

const SIZE = 20_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => i * 0.5 + Math.sin(i * 0.01)),
  b: Array.from({ length: SIZE }, (_, i) => i * 0.3 - Math.cos(i * 0.02)),
  c: Array.from({ length: SIZE }, (_, i) => (i % 100) * 1.5),
});

for (let i = 0; i < WARMUP; i++) {
  dataFrameCov(df, { ddof: 0 });
  dataFrameCov(df, { ddof: 1, minPeriods: 100 });
  dataFrameCorr(df, { minPeriods: 50 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameCov(df, { ddof: 0 });
  dataFrameCov(df, { ddof: 1, minPeriods: 100 });
  dataFrameCorr(df, { minPeriods: 50 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_cov_options",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
