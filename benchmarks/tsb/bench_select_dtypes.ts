/**
 * Benchmark: selectDtypes — filter DataFrame columns by dtype.
 * Outputs JSON: {"function": "select_dtypes", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { selectDtypes, DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i),
  b: Array.from({ length: SIZE }, (_, i) => i * 1.5),
  c: Array.from({ length: SIZE }, (_, i) => `str${i % 1000}`),
  d: Array.from({ length: SIZE }, (_, i) => i % 2 === 0),
  e: Array.from({ length: SIZE }, (_, i) => i * 2),
  f: Array.from({ length: SIZE }, (_, i) => `label${i % 100}`),
});

for (let i = 0; i < WARMUP; i++) {
  selectDtypes(df, { include: ["number"] });
  selectDtypes(df, { include: ["string"] });
  selectDtypes(df, { exclude: ["boolean"] });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  selectDtypes(df, { include: ["number"] });
  selectDtypes(df, { include: ["string"] });
  selectDtypes(df, { exclude: ["boolean"] });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "select_dtypes",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
