"""Benchmark: Series.shift and Series.diff on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.arange(ROWS, dtype=float) * 1.5
s = pd.Series(data)

for _ in range(WARMUP):
    s.shift(1)
    s.diff(1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.shift(1)
    s.diff(1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "shift_diff",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
