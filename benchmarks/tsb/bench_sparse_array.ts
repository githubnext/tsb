/**
 * Benchmark: SparseArray fromDense / toDense / aggregations on 100k-element array (5% density)
 */
import { SparseArray } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

// ~5% density: most values are 0 (fill_value), 5k are non-zero
const dense: number[] = new Array(N).fill(0);
for (let i = 0; i < N; i += 20) {
  dense[i] = Math.sin(i * 0.001) * 100 + 1;
}

// Pre-built sparse array for operations that don't test construction
const sparse = SparseArray.fromDense(dense, 0, "float64");

// Warm up
for (let i = 0; i < WARMUP; i++) {
  SparseArray.fromDense(dense, 0, "float64");
  sparse.toDense();
  sparse.sum();
  sparse.mean();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  SparseArray.fromDense(dense, 0, "float64");
  sparse.toDense();
  sparse.sum();
  sparse.mean();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "sparse_array",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
