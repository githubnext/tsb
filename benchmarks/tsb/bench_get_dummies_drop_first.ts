/**
 * Benchmark: getDummies / dataFrameGetDummies with drop_first and prefix options.
 * Outputs JSON: {"function": "get_dummies_drop_first", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, DataFrame, getDummies, dataFrameGetDummies } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Categorical series with 10 distinct values
const catData = Array.from({ length: ROWS }, (_, i) => `cat_${i % 10}`);
const s = new Series({ data: catData });
const df = DataFrame.fromColumns({
  category: catData,
  value: Float64Array.from({ length: ROWS }, (_, i) => i * 0.1),
});

for (let i = 0; i < WARMUP; i++) {
  getDummies(s, { dropFirst: true });
  getDummies(s, { prefix: "grp", prefixSep: "_" });
  dataFrameGetDummies(df, { columns: ["category"], dropFirst: true });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  getDummies(s, { dropFirst: true });
  getDummies(s, { prefix: "grp", prefixSep: "_" });
  dataFrameGetDummies(df, { columns: ["category"], dropFirst: true });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "get_dummies_drop_first",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
