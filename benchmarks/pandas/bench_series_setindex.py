"""Benchmark: series_setindex — pd.Series with new index on a 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.arange(ROWS, dtype=float) * 1.5
s = pd.Series(data)
new_index = pd.Index([f"key{i}" for i in range(ROWS)])

for _ in range(WARMUP):
    s.set_axis(new_index)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.set_axis(new_index)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_setindex",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
