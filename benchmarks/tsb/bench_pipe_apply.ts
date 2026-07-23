/**
 * Benchmark: pipe / seriesApply / dataFrameApplyMap on 10,000-row datasets.
 *
 * Exercises three functional-pipeline operations:
 *   - pipe: chain 4 transforms on a Series
 *   - seriesApply: element-wise function on 10k-element Series
 *   - dataFrameApplyMap: element-wise function on 10k × 3 DataFrame
 */
import { Series, DataFrame, pipe, seriesApply, dataFrameApplyMap } from "../../src/index.js";

const N = 10_000;
const WARMUP = 5;
const ITERATIONS = 20;

const raw = Float64Array.from({ length: N }, (_, i) => (i % 100) + 1);
const series = new Series(raw, { name: "x" });
const df = DataFrame.fromColumns({
  a: Array.from({ length: N }, (_, i) => (i % 50) + 1),
  b: Array.from({ length: N }, (_, i) => (i % 30) + 1),
  c: Array.from({ length: N }, (_, i) => (i % 20) + 1),
});

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  pipe(series, (s) => s.add(1), (s) => s.mul(2), (s) => s.sub(1), (s) => s.div(2));
  seriesApply(series, (v) => (v as number) * 2 + 1);
  dataFrameApplyMap(df, (v) => (v as number) * 2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pipe(series, (s) => s.add(1), (s) => s.mul(2), (s) => s.sub(1), (s) => s.div(2));
  seriesApply(series, (v) => (v as number) * 2 + 1);
  dataFrameApplyMap(df, (v) => (v as number) * 2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pipe_apply",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
