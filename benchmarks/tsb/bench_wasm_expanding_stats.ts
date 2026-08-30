/**
 * Benchmark: expandingMinF64Accelerated / expandingMaxF64Accelerated /
 *            expandingVarF64Accelerated / expandingStdF64Accelerated /
 *            expandingMedianF64Accelerated
 * — the WASM-backed expanding-window stat functions (fall back to pure TS when
 *   WASM is not loaded).
 *
 * Mirrors pandas Series.expanding().min() / .max() / .var() / .std() / .median()
 * on a 10 000-element float64 dataset (median is O(n²) so we use a smaller array).
 *
 * Outputs JSON: {"function": "wasm_expanding_stats", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  expandingMinF64Accelerated,
  expandingMaxF64Accelerated,
  expandingVarF64Accelerated,
  expandingStdF64Accelerated,
  expandingMedianF64Accelerated,
} from "../../src/wasm/index.ts";

const SIZE = 10_000;
const WARMUP = 3;
const ITERATIONS = 20;
const MIN_PERIODS = 1;

const data: number[] = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.01) * 100);

for (let i = 0; i < WARMUP; i++) {
  expandingMinF64Accelerated(data, MIN_PERIODS);
  expandingMaxF64Accelerated(data, MIN_PERIODS);
  expandingVarF64Accelerated(data, MIN_PERIODS);
  expandingStdF64Accelerated(data, MIN_PERIODS);
  expandingMedianF64Accelerated(data, MIN_PERIODS);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  expandingMinF64Accelerated(data, MIN_PERIODS);
  expandingMaxF64Accelerated(data, MIN_PERIODS);
  expandingVarF64Accelerated(data, MIN_PERIODS);
  expandingStdF64Accelerated(data, MIN_PERIODS);
  expandingMedianF64Accelerated(data, MIN_PERIODS);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "wasm_expanding_stats",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
