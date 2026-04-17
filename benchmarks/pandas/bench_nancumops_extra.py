"""
Benchmark: np.nanmedian / nancount / np.nanprod — additional nan-ignoring aggregates on 100k array.
Outputs JSON: {"function": "nancumops_extra", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

# Array with ~10% NaN values
data = np.array([float("nan") if i % 10 == 0 else math.sin(i * 0.01) * 100 + 50 for i in range(SIZE)])

for _ in range(WARMUP):
    np.nanmedian(data)
    np.count_nonzero(~np.isnan(data))
    np.nanprod(data[:100])  # limit to 100 to avoid overflow

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.nanmedian(data)
    np.count_nonzero(~np.isnan(data))
    np.nanprod(data[:100])
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "nancumops_extra", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
