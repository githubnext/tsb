"""Benchmark: series_at_iat — pd.Series.at and .iat point access on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.arange(ROWS, dtype=float) * 1.5
s = pd.Series(data)

for _ in range(WARMUP):
    for j in range(1000): s.iat[j]
    for j in range(1000): s.at[j]

start = time.perf_counter()
for _ in range(ITERATIONS):
    for j in range(1000): s.iat[j]
    for j in range(1000): s.at[j]
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_at_iat",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
