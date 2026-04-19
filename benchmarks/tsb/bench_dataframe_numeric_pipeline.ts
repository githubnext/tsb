/**
 * Benchmark: DataFrame numeric pipeline — chain abs → round → sign on a 100k-row × 3-column DataFrame.
 * Tests a realistic sequence of standalone DataFrame numeric operations.
 * Outputs JSON: {"function": "dataframe_numeric_pipeline", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, dataFrameAbs, dataFrameRound, dataFrameSign } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 150 - 20),
  b: Array.from({ length: SIZE }, (_, i) => Math.cos(i * 0.02) * 80),
  c: Array.from({ length: SIZE }, (_, i) => (i % 1000) * 0.123 - 50),
});

for (let i = 0; i < WARMUP; i++) {
  const a = dataFrameAbs(df);
  const b = dataFrameRound(a, { decimals: 1 });
  dataFrameSign(b);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const a = dataFrameAbs(df);
  const b = dataFrameRound(a, { decimals: 1 });
  dataFrameSign(b);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_numeric_pipeline",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
