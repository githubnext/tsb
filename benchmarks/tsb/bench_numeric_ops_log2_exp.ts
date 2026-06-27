/**
 * Benchmark: seriesLog2 / seriesLog10 / seriesExp / seriesSign and DataFrame variants.
 *
 * Mirrors numpy/pandas element-wise math functions on 100k-row data:
 *   - np.log2(s), np.log10(s), np.exp(s), np.sign(s)
 *   - DataFrame.apply(np.log2), etc.
 *
 * Outputs JSON: {"function": "numeric_ops_log2_exp", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  DataFrame,
  seriesLog2,
  seriesLog10,
  seriesExp,
  seriesSign,
  dataFrameLog2,
  dataFrameLog10,
  dataFrameExp,
  dataFrameSign,
} from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Positive values for log2/log10; any values for exp/sign
const data = Array.from({ length: SIZE }, (_, i) => (i + 1) * 0.1);
const s = new Series({ data });
const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => (i + 1) * 0.1),
  b: Array.from({ length: SIZE }, (_, i) => (i + 1) * 0.2),
});

for (let i = 0; i < WARMUP; i++) {
  seriesLog2(s);
  seriesLog10(s);
  seriesExp(s);
  seriesSign(s);
  dataFrameLog2(df);
  dataFrameLog10(df);
  dataFrameExp(df);
  dataFrameSign(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesLog2(s);
  seriesLog10(s);
  seriesExp(s);
  seriesSign(s);
  dataFrameLog2(df);
  dataFrameLog10(df);
  dataFrameExp(df);
  dataFrameSign(df);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "numeric_ops_log2_exp",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
