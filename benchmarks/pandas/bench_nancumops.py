"""
Benchmark: np.nansum / np.nanmean / np.nanvar / np.nanstd — nan-ignoring aggregates on 100k array.
Outputs JSON: {"function": "nancumops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

# Array with ~10% NaN values
data = np.array([float("nan") if i % 10 == 0 else math.sin(i * 0.01) * 100 for i in range(SIZE)])

for _ in range(WARMUP):
    np.nansum(data)
    np.nanmean(data)
    np.nanvar(data)
    np.nanstd(data)
    np.nanmin(data)
    np.nanmax(data)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.nansum(data)
    np.nanmean(data)
    np.nanvar(data)
    np.nanstd(data)
    np.nanmin(data)
    np.nanmax(data)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "nancumops", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
