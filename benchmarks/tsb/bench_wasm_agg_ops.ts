/**
 * Benchmark: WASM-accelerated aggregate operations — sumF64Accelerated, meanF64Accelerated,
 * minF64Accelerated, maxF64Accelerated, varF64Accelerated, stdF64Accelerated, medianF64Accelerated
 * plus rolling and expanding variants on a 100k-element float64 array.
 *
 * Mirrors numpy aggregate functions (np.sum, np.mean, np.min, np.max, np.var, np.std, np.median)
 * and pandas rolling/expanding window ops.
 *
 * Outputs JSON: {"function": "wasm_agg_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  sumF64Accelerated,
  meanF64Accelerated,
  minF64Accelerated,
  maxF64Accelerated,
  varF64Accelerated,
  stdF64Accelerated,
  medianF64Accelerated,
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

const data: number[] = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.001) * 1000);

function run(): void {
  sumF64Accelerated(data);
  meanF64Accelerated(data);
  minF64Accelerated(data);
  maxF64Accelerated(data);
  varF64Accelerated(data);
  stdF64Accelerated(data);
  medianF64Accelerated(data);
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
    function: "wasm_agg_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
