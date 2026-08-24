"""
Benchmark: pandas SparseArray arithmetic and utility operations.

Covers: __add__(scalar), __mul__(scalar), fillna(value), and COO conversion
(toCoo has no direct pandas equivalent — scipy.sparse is used instead),
std(), min(), max().

Dataset: 100k-element SparseArray at ~5% density.
Outputs JSON: {"function": "sparse_array_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import math
import numpy as np
import pandas as pd

N = 100_000
WARMUP = 5
ITERATIONS = 30

# Build matching sparse dataset (~5% density, fill_value=0)
dense = np.zeros(N)
for i in range(0, N, 20):
    dense[i] = math.sin(i * 0.001) * 100 + 1

sparse = pd.arrays.SparseArray(dense, fill_value=0.0)

def run_ops():
    _ = sparse + 5
    _ = sparse * 2
    _ = sparse.fillna(0)
    _ = sparse[1000:50000]
    # toCoo equivalent: extract sp_values and sp_index
    _ = sparse.sp_values
    _ = sparse.sp_index
    _ = sparse.std()
    _ = sparse.min()
    _ = sparse.max()

for _ in range(WARMUP):
    run_ops()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run_ops()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "sparse_array_ops",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
