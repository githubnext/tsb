/**
 * Benchmark: SparseArray arithmetic and utility operations.
 *
 * Covers: add(scalar), mul(scalar), fillna(value), slice(start, end),
 *         toCoo(), std(), min(), max()
 * Dataset: 100k-element sparse array at ~5% density.
 * Outputs JSON: {"function": "sparse_array_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { SparseArray } from "../../src/index.js";

const N = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const dense: number[] = new Array(N).fill(0);
for (let i = 0; i < N; i += 20) {
  dense[i] = Math.sin(i * 0.001) * 100 + 1;
}

const sparse = SparseArray.fromDense(dense, 0, "float64");

for (let i = 0; i < WARMUP; i++) {
  sparse.add(5);
  sparse.mul(2);
  sparse.fillna(0);
  sparse.slice(1000, 50000);
  sparse.toCoo();
  sparse.std();
  sparse.min();
  sparse.max();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  sparse.add(5);
  sparse.mul(2);
  sparse.fillna(0);
  sparse.slice(1000, 50000);
  sparse.toCoo();
  sparse.std();
  sparse.min();
  sparse.max();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "sparse_array_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
