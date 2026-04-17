/**
 * Benchmark: standalone dataFrameRollingApply — apply a custom function over each column's rolling window.
 * Outputs JSON: {"function": "dataframe_rolling_apply_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameRollingApply } from "../../src/index.ts";

const ROWS = 5_000;
const WINDOW = 10;
const WARMUP = 3;
const ITERATIONS = 10;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01)),
  b: Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.02)),
  c: Array.from({ length: ROWS }, (_, i) => (i % 100) * 0.5),
});

const rangeFn = (vals: readonly number[]) => {
  let mn = vals[0] ?? 0;
  let mx = vals[0] ?? 0;
  for (const v of vals) {
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  return mx - mn;
};

for (let i = 0; i < WARMUP; i++) {
  dataFrameRollingApply(df, WINDOW, rangeFn);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameRollingApply(df, WINDOW, rangeFn);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_rolling_apply_fn",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
