/**
 * Benchmark: FixedForwardWindowIndexer, VariableOffsetWindowIndexer, applyIndexer.
 *
 * Mirrors pandas.api.indexers.FixedForwardWindowIndexer and
 * pandas.api.indexers.VariableOffsetWindowIndexer.
 *
 * Uses a 50k-row dataset. Each iteration:
 * - Generates bounds via FixedForwardWindowIndexer (window=5) on 50k rows.
 * - Generates bounds via VariableOffsetWindowIndexer with random offsets.
 * - Applies applyIndexer with FixedForwardWindowIndexer to compute rolling sum.
 *
 * Outputs JSON: {"function": "window_indexers", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  FixedForwardWindowIndexer,
  VariableOffsetWindowIndexer,
  applyIndexer,
} from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 50;

const fwdIdx = new FixedForwardWindowIndexer({ windowSize: 5 });
const offsets = Array.from({ length: SIZE }, (_, i) => (i % 10) + 1);
const varIdx = new VariableOffsetWindowIndexer({ offsets });
const values = Array.from({ length: SIZE }, (_, i) => (i * 0.1) % 100);

for (let i = 0; i < WARMUP; i++) {
  fwdIdx.getWindowBounds(SIZE);
  varIdx.getWindowBounds(SIZE);
  applyIndexer(fwdIdx, values, (nums) => nums.reduce((a, b) => a + b, 0));
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  fwdIdx.getWindowBounds(SIZE);
  varIdx.getWindowBounds(SIZE);
  applyIndexer(fwdIdx, values, (nums) => nums.reduce((a, b) => a + b, 0));
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "window_indexers",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
