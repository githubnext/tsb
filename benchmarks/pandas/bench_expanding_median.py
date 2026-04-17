"""Benchmark: Expanding.median on 10k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 2
ITERATIONS = 5

data = np.sin(np.arange(ROWS) * 0.01)
s = pd.Series(data)

for _ in range(WARMUP):
    s.expanding().median()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.expanding().median()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "expanding_median",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
