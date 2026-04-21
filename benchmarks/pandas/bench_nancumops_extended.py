"""Benchmark: nanprod / nanmedian / nancount — nan-ignoring aggregates on a 100k-element array.
Outputs JSON: {"function": "nancumops_extended", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import math
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

# Array with ~10% NaN values; small floats to keep product finite
data = np.array([
    np.nan if i % 10 == 0 else 1.0 + math.sin(i * 0.001) * 0.001
    for i in range(SIZE)
])
s = pd.Series(data)

for _ in range(WARMUP):
    np.nanprod(data)
    np.nanmedian(data)
    np.count_nonzero(~np.isnan(data))

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.nanprod(data)
    np.nanmedian(data)
    np.count_nonzero(~np.isnan(data))
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "nancumops_extended",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
