/**
 * Benchmark: WASM-accelerated rolling and expanding sum/mean —
 * rollingSumF64Accelerated, rollingMeanF64Accelerated,
 * expandingSumF64Accelerated, expandingMeanF64Accelerated on a 100k-element float64 array.
 *
 * Mirrors pandas Series.rolling().sum(), Series.rolling().mean(),
 * Series.expanding().sum(), Series.expanding().mean().
 *
 * Outputs JSON: {"function": "wasm_rolling_sum_mean", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  rollingSumF64Accelerated,
  rollingMeanF64Accelerated,
  expandingSumF64Accelerated,
  expandingMeanF64Accelerated,
} from "../../src/wasm/index.ts";

const SIZE = 100_000;
const WINDOW = 50;
const MIN_PERIODS = 1;
const WARMUP = 3;
const ITERATIONS = 20;

const data: number[] = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.001) * 100 + i * 0.01);

function run(): void {
  rollingSumF64Accelerated(data, WINDOW, MIN_PERIODS);
  rollingMeanF64Accelerated(data, WINDOW, MIN_PERIODS);
  expandingSumF64Accelerated(data, MIN_PERIODS);
  expandingMeanF64Accelerated(data, MIN_PERIODS);
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "wasm_rolling_sum_mean",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
