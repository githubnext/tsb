"""
Benchmark: np.nanvar / np.nanmin / np.nanmax — nan-ignoring aggregates on 100k-element arrays.
Outputs JSON: {"function": "nan_var_min_max", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

# Array with ~10% NaN values
data = np.array([float("nan") if i % 10 == 0 else (i % 1000) * 0.1 - 50 for i in range(SIZE)])

for _ in range(WARMUP):
    np.nanvar(data)
    np.nanmin(data)
    np.nanmax(data)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.nanvar(data)
    np.nanmin(data)
    np.nanmax(data)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "nan_var_min_max", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
