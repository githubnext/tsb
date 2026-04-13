"""Benchmark: expanding mean on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.cos(np.arange(ROWS) * 0.01)
s = pd.Series(data)

for _ in range(WARMUP):
    s.expanding(1).mean()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.expanding(1).mean()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "expanding_mean",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
