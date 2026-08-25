/**
 * Benchmark: WASM-accelerated rolling and expanding statistics —
 * rollingMinF64Accelerated, rollingMaxF64Accelerated, rollingVarF64Accelerated,
 * rollingStdF64Accelerated, rollingMedianF64Accelerated,
 * expandingMinF64Accelerated, expandingMaxF64Accelerated,
 * expandingVarF64Accelerated, expandingStdF64Accelerated,
 * expandingMedianF64Accelerated on a 100k-element float64 array.
 *
 * Mirrors pandas Series.rolling() and Series.expanding() with min/max/var/std/median.
 *
 * Outputs JSON: {"function": "wasm_rolling_stats", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  rollingMinF64Accelerated,
  rollingMaxF64Accelerated,
  rollingVarF64Accelerated,
  rollingStdF64Accelerated,
  rollingMedianF64Accelerated,
  expandingMinF64Accelerated,
  expandingMaxF64Accelerated,
  expandingVarF64Accelerated,
  expandingStdF64Accelerated,
  expandingMedianF64Accelerated,
} from "../../src/wasm/index.ts";

const SIZE = 100_000;
const WINDOW = 50;
const MIN_PERIODS = 1;
const WARMUP = 3;
const ITERATIONS = 20;

// Deterministic float64 data
const data = new Float64Array(SIZE);
for (let i = 0; i < SIZE; i++) {
  data[i] = Math.sin(i * 0.001) * 100 + Math.cos(i * 0.003) * 50;
}

function runOnce(): void {
  rollingMinF64Accelerated(data, WINDOW, MIN_PERIODS);
  rollingMaxF64Accelerated(data, WINDOW, MIN_PERIODS);
  rollingVarF64Accelerated(data, WINDOW, MIN_PERIODS);
  rollingStdF64Accelerated(data, WINDOW, MIN_PERIODS);
  rollingMedianF64Accelerated(data, WINDOW, MIN_PERIODS);
  expandingMinF64Accelerated(data, MIN_PERIODS);
  expandingMaxF64Accelerated(data, MIN_PERIODS);
  expandingVarF64Accelerated(data, MIN_PERIODS);
  expandingStdF64Accelerated(data, MIN_PERIODS);
  expandingMedianF64Accelerated(data, MIN_PERIODS);
}

// Warm-up
for (let i = 0; i < WARMUP; i++) runOnce();

// Measured iterations
const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) runOnce();
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "wasm_rolling_stats",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
