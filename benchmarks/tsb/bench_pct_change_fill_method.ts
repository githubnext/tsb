/**
 * Benchmark: pctChangeSeries / pctChangeDataFrame with fillMethod options.
 * Outputs JSON: {"function": "pct_change_fill_method", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, pctChangeSeries, pctChangeDataFrame } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Series with some nulls so fillMethod has effect
const data: (number | null)[] = Array.from({ length: SIZE }, (_, i) =>
  i % 20 === 0 ? null : Math.sin(i * 0.01) * 100 + 100,
);
const s = new Series({ data });

const df = DataFrame.fromColumns({
  a: data,
  b: Array.from({ length: SIZE }, (_, i) => (i % 15 === 0 ? null : Math.cos(i * 0.02) * 50 + 50)),
});

for (let i = 0; i < WARMUP; i++) {
  pctChangeSeries(s, { fillMethod: "pad" });
  pctChangeSeries(s, { fillMethod: "bfill" });
  pctChangeSeries(s, { fillMethod: null });
  pctChangeDataFrame(df, { fillMethod: "pad", periods: 2 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pctChangeSeries(s, { fillMethod: "pad" });
  pctChangeSeries(s, { fillMethod: "bfill" });
  pctChangeSeries(s, { fillMethod: null });
  pctChangeDataFrame(df, { fillMethod: "pad", periods: 2 });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pct_change_fill_method",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
