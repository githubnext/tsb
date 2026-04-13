"""Benchmark: Series.nlargest — top-100 elements from a 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS) * 0.007) * 500 + np.arange(ROWS) * 0.001
s = pd.Series(data)

for _ in range(WARMUP):
    s.nlargest(100)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.nlargest(100)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_nlargest",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
