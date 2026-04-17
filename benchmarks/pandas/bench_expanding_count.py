"""Benchmark: Expanding.count on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.where(np.arange(ROWS) % 10 == 0, np.nan, np.sin(np.arange(ROWS) * 0.01))
s = pd.Series(data)

for _ in range(WARMUP):
    s.expanding().count()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.expanding().count()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "expanding_count",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
