/**
 * Benchmark: contingency — expectedFreq, relativeRisk, oddsRatio, association
 * Dataset: 4×4 contingency table built from 100,000 categorised observations.
 */
import { expectedFreq, relativeRisk, oddsRatio, association } from "../../src/index.js";

const WARMUP = 10;
const ITERS = 50;

// Build a 4×4 observed count table
const observed: readonly (readonly number[])[] = [
  [120, 80, 40, 60],
  [90, 110, 70, 30],
  [50, 60, 100, 90],
  [40, 50, 90, 120],
];

// 2×2 table for relativeRisk / oddsRatio (requires exactly 2 rows × 2 cols)
const twoByTwo: readonly (readonly number[])[] = [
  [60, 40],
  [30, 70],
];

// Warm up
for (let i = 0; i < WARMUP; i++) {
  expectedFreq(observed);
  relativeRisk(twoByTwo);
  oddsRatio(twoByTwo);
  association(observed, "cramer");
}

// Measure
const start = performance.now();
for (let i = 0; i < ITERS; i++) {
  expectedFreq(observed);
  relativeRisk(twoByTwo);
  oddsRatio(twoByTwo);
  association(observed, "cramer");
}
const total_ms = performance.now() - start;
const mean_ms = total_ms / ITERS;

console.log(
  JSON.stringify({
    function: "contingency",
    mean_ms: parseFloat(mean_ms.toFixed(4)),
    iterations: ITERS,
    total_ms: parseFloat(total_ms.toFixed(4)),
  }),
);
