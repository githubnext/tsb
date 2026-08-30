"""
Benchmark: SparseArray.fromSparse / withFillValue / at / SparseDtype

Mirrors tsb's bench_sparse_array_advanced.ts using pandas SparseArray and
SparseDtype equivalents.

Covers:
  - pd.arrays.SparseArray(dense, fill_value=np.nan)  — construction (fromDense/fromSparse proxy)
  - SparseArray.to_dense()                            — equivalent to at() over all elements
  - SparseArray.sp_values / .sp_index                — COO-level access
  - pd.SparseDtype("float64", fill_value=0.0)        — dtype introspection + equality

Dataset: 100k-element sparse array at ~2% density (2k non-zero values).

Outputs JSON: {"function": "sparse_array_advanced", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import math
import time

import numpy as np
import pandas as pd

N = 100_000
DENSITY = 0.02
NNZ = int(N * DENSITY)  # 2000 non-zeros
WARMUP = 5
ITERATIONS = 30

# Build dense array with ~2% non-zero values
dense = np.zeros(N, dtype="float64")
for i in range(NNZ):
    idx = int((i / NNZ) * N)
    dense[idx] = math.sin(i * 0.05) * 100 + 1

def run_once():
    # fromSparse equivalent: construct SparseArray from dense (pandas auto-detects sparsity)
    sa = pd.arrays.SparseArray(dense, fill_value=float("nan"))

    # withFillValue equivalent: pandas does not have this method directly;
    # use pd.arrays.SparseArray(sa.to_dense(), fill_value=0.0)
    sa2 = pd.arrays.SparseArray(sa.to_dense(), fill_value=0.0)

    # at() equivalent: element access via numpy index on sp_values
    _ = sa.sp_values[: min(50, len(sa.sp_values))]

    # SparseDtype: construction and equality
    dt1 = pd.SparseDtype("float64")
    dt2 = pd.SparseDtype("float64", fill_value=0.0)
    _ = dt1 == dt2

    return sa, sa2

# Warm up
for _ in range(WARMUP):
    run_once()

# Measure
start = time.perf_counter()
for _ in range(ITERATIONS):
    run_once()
total = (time.perf_counter() - start) * 1000  # convert to ms

print(json.dumps({
    "function": "sparse_array_advanced",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
