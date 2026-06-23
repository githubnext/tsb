/**
 * Benchmark: dataFrameUpdate — in-place-style DataFrame value update.
 *
 * Mirrors pandas `DataFrame.update()`.
 * Overwrites non-null values from `other` into `self`.
 * Outputs JSON: {"function": "dataframe_update", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, dataFrameUpdate } from "../../src/index.ts";

const N = 10_000;
const WARMUP = 20;
const ITERATIONS = 200;

// Build two DataFrames; `other` has null in ~2/3 of rows (so 1/3 rows are updated).
const aData = Array.from({ length: N }, (_, i) => i * 1.0);
const bData = Array.from({ length: N }, (_, i) => i * 2.0);

const aOther = Array.from({ length: N }, (_, i) =>
  i % 3 === 0 ? i * 10.0 : (null as unknown as number),
);
const bOther = Array.from({ length: N }, (_, i) =>
  i % 3 === 0 ? i * 20.0 : (null as unknown as number),
);

const df = new DataFrame({ a: aData, b: bData });
const other = new DataFrame({ a: aOther, b: bOther });

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  dataFrameUpdate(df, other);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  dataFrameUpdate(df, other);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_update",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total_ms,
  }),
);
