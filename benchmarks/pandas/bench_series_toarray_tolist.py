"""Benchmark: Series tolist and to_numpy on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.arange(ROWS) * 0.5
s = pd.Series(data)

for _ in range(WARMUP):
    s.tolist()
    s.to_numpy()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.tolist()
    s.to_numpy()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_toarray_tolist",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
