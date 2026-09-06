/**
 * Benchmark: sumF64Accelerated / meanF64Accelerated / minF64Accelerated /
 * maxF64Accelerated / varF64Accelerated / stdF64Accelerated / medianF64Accelerated
 * — WASM-backed full-array scalar reductions (fall back to pure TS when WASM
 * is not loaded).
 *
 * Mirrors numpy.sum / numpy.mean / numpy.min / numpy.max / numpy.var(ddof=1) /
 * numpy.std(ddof=1) / numpy.median on a 100k-element float64 dataset.
 *
 * Outputs JSON: {"function": "wasm_agg_scalar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  sumF64Accelerated,
  meanF64Accelerated,
  minF64Accelerated,
  maxF64Accelerated,
  varF64Accelerated,
  stdF64Accelerated,
  medianF64Accelerated,
} from "../../src/wasm/index.ts";

const SIZE = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const arr: number[] = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.001) * SIZE);

function runOnce(): void {
  sumF64Accelerated(arr);
  meanF64Accelerated(arr);
  minF64Accelerated(arr);
  maxF64Accelerated(arr);
  varF64Accelerated(arr, 1);
  stdF64Accelerated(arr, 1);
  medianF64Accelerated(arr);
}

for (let i = 0; i < WARMUP; i++) {
  runOnce();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  runOnce();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "wasm_agg_scalar",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
