/**
 * Benchmark: chi2Contingency — chi-squared test of independence on contingency tables.
 * Mirrors scipy.stats.chi2_contingency (pandas users typically call scipy via pandas workflows).
 * Dataset: 500 iterations over a 4×4, 5×3, and 3×5 contingency table.
 * Outputs JSON: {"function": "chi2_contingency", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { chi2Contingency } from "../../src/index.ts";

const WARMUP = 10;
const ITERATIONS = 500;

// Four representative contingency tables
const table4x4: readonly (readonly number[])[] = [
  [10, 20, 30, 15],
  [25, 35, 10, 20],
  [15, 10, 25, 30],
  [20, 15, 35, 10],
];
const table5x3: readonly (readonly number[])[] = [
  [50, 30, 20],
  [40, 45, 15],
  [35, 25, 40],
  [20, 50, 30],
  [55, 10, 35],
];
const table3x5: readonly (readonly number[])[] = [
  [10, 20, 15, 25, 30],
  [30, 15, 25, 10, 20],
  [20, 30, 10, 35, 5],
];

for (let i = 0; i < WARMUP; i++) {
  chi2Contingency(table4x4);
  chi2Contingency(table5x3);
  chi2Contingency(table3x5);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  chi2Contingency(table4x4);
  chi2Contingency(table5x3);
  chi2Contingency(table3x5);
}
const total_ms = performance.now() - t0;
const mean_ms = total_ms / ITERATIONS;

console.log(JSON.stringify({ function: "chi2_contingency", mean_ms, iterations: ITERATIONS, total_ms }));
