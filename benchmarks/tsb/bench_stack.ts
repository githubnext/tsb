/**
 * Benchmark: DataFrame.stack() — pivot innermost column level to row index.
 * Outputs JSON: {"function": "stack", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const ROWS = 1_000;
const COLS = 20;
const WARMUP = 5;
const ITERATIONS = 50;

const cols: Record<string, number[]> = {};
for (let j = 1; j <= COLS; j++) {
  cols[`c${j}`] = Array.from({ length: ROWS }, (_, i) => i * j + 0.5);
}
const df = new DataFrame(cols);

for (let i = 0; i < WARMUP; i++) df.stack();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  df.stack();
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "stack",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
