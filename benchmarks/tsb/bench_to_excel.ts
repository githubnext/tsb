/**
 * Benchmark: toExcel — serialize a DataFrame to an XLSX binary buffer.
 * Outputs JSON: {"function": "to_excel", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, toExcel } from "../../src/index.ts";

const ROWS = 5_000;
const WARMUP = 3;
const ITERATIONS = 20;

const index = Array.from({ length: ROWS }, (_, i) => i);
const colA = Array.from({ length: ROWS }, (_, i) => `name_${i % 1000}`);
const colB = Array.from({ length: ROWS }, (_, i) => i * 1.5);
const colC = Array.from({ length: ROWS }, (_, i) => i % 2 === 0);

const df = new DataFrame({ name: colA, value: colB, flag: colC }, { index });

for (let i = 0; i < WARMUP; i++) {
  toExcel(df);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  toExcel(df);
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "to_excel",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
