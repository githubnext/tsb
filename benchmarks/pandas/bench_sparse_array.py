"""Benchmark: SparseArray fromDense / toDense / aggregations on 100k-element array (5% density)"""
import json
import time
import numpy as np
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 10

# ~5% density: most values are 0, ~5k non-zero
dense = np.zeros(N)
for i in range(0, N, 20):
    dense[i] = np.sin(i * 0.001) * 100 + 1

# Pre-built sparse array for operations that don't test construction
sparse = pd.arrays.SparseArray(dense, fill_value=0)

# Warm up
for _ in range(WARMUP):
    pd.arrays.SparseArray(dense, fill_value=0)
    sparse.to_dense()
    sparse.sum()
    sparse.mean()

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.arrays.SparseArray(dense, fill_value=0)
    sparse.to_dense()
    sparse.sum()
    sparse.mean()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "sparse_array",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
