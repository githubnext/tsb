/**
 * Benchmark: DataFrame element-wise comparison operations
 *
 * Measures dataFrameEq / dataFrameNe / dataFrameLt / dataFrameGt /
 * dataFrameLe / dataFrameGe against both a scalar and another DataFrame.
 *
 * Dataset: 10,000-row × 4-column DataFrame; 100 measured iterations.
 */

import {
  DataFrame,
  dataFrameEq,
  dataFrameNe,
  dataFrameLt,
  dataFrameGt,
  dataFrameLe,
  dataFrameGe,
} from "../../src/index.js";

const N = 10_000;
const WARMUP = 5;
const ITERS = 100;

const a = Float64Array.from({ length: N }, (_, i) => (i % 1000) * 0.5);
const b = Float64Array.from({ length: N }, (_, i) => (i % 750) * 0.7);
const df = DataFrame.fromColumns({
  x: Array.from(a),
  y: Array.from(b),
  z: Array.from(a).map((v) => v * 2),
  w: Array.from(b).map((v) => v + 1),
});
const df2 = DataFrame.fromColumns({
  x: Array.from(b),
  y: Array.from(a),
  z: Array.from(b).map((v) => v * 2),
  w: Array.from(a).map((v) => v + 1),
});

function bench(): void {
  dataFrameEq(df, 250);
  dataFrameNe(df, 250);
  dataFrameLt(df, 300);
  dataFrameGt(df, 100);
  dataFrameLe(df, 500);
  dataFrameGe(df, 50);
  dataFrameEq(df, df2);
  dataFrameLt(df, df2);
}

for (let i = 0; i < WARMUP; i++) bench();

const t0 = performance.now();
for (let i = 0; i < ITERS; i++) bench();
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "compare_dataframe",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
