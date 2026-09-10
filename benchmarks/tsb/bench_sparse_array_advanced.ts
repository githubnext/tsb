/**
 * Benchmark: SparseArray.fromSparse / withFillValue / at / SparseDtype
 *
 * Covers:
 *   - SparseArray.fromSparse(length, indices, values, fill_value) — construct from COO representation
 *   - SparseArray.withFillValue(newFill)                          — change fill value
 *   - SparseArray.at(i)                                           — random-access element lookup
 *   - SparseDtype constructor and .equals()                       — dtype introspection
 *
 * Mirrors pandas:
 *   - pd.arrays.SparseArray(np.array(dense), fill_value=np.nan) with manual COO input
 *   - SparseArray.to_dense() then re-wrap (withFillValue proxy)
 *   - sparse_arr[idx] / sparse_arr.sp_values / .sp_index
 *   - pd.SparseDtype("float64", fill_value=0.0) and dtype equality
 *
 * Dataset: 100k-element sparse array at ~2% density (2k non-zero values).
 *
 * Outputs JSON: {"function": "sparse_array_advanced", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { SparseArray, SparseDtype } from "../../src/index.js";

const N = 100_000;
const DENSITY = 0.02;
const NNZ = Math.floor(N * DENSITY); // 2000 non-zeros
const WARMUP = 5;
const ITERATIONS = 30;

// Build COO representation once
const indices: number[] = [];
const values: number[] = [];
for (let i = 0; i < NNZ; i++) {
  indices.push(Math.floor((i / NNZ) * N));
  values.push(Math.sin(i * 0.05) * 100 + 1);
}

// Also build the dense array so fromDense comparison is fair
const dense: number[] = new Array(N).fill(0);
for (let k = 0; k < NNZ; k++) {
  const idx = indices[k];
  if (idx !== undefined) {
    dense[idx] = values[k] ?? 0;
  }
}

const sparse = SparseArray.fromSparse(N, indices, values, Number.NaN, "float64");

// Warm up all operations
for (let i = 0; i < WARMUP; i++) {
  SparseArray.fromSparse(N, indices, values, Number.NaN, "float64");
  sparse.withFillValue(0);
  sparse.at(0);
  sparse.at(N - 1);
  const dt1 = new SparseDtype("float64");
  const dt2 = new SparseDtype("float64", 0);
  dt1.equals(dt2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  // fromSparse: construct a SparseArray from COO (indices + values + length)
  SparseArray.fromSparse(N, indices, values, Number.NaN, "float64");

  // withFillValue: rebuild the array with a different fill sentinel
  sparse.withFillValue(0);

  // at: random-access lookup for a mix of fill and non-fill positions
  for (let j = 0; j < 50; j++) {
    sparse.at(j * 2000);
  }

  // SparseDtype: construction + equality check
  const dt1 = new SparseDtype("float64");
  const dt2 = new SparseDtype("float64", 0);
  dt1.equals(dt2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "sparse_array_advanced",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
