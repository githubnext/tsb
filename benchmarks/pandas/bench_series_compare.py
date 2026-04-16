"""Benchmark: Series comparison operators (eq, ne, lt, gt, le, ge) on 100k Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

data = np.arange(ROWS) * 0.1
s = pd.Series(data)
threshold = ROWS * 0.05

for _ in range(WARMUP):
    s.eq(threshold)
    s.ne(threshold)
    s.lt(threshold)
    s.gt(threshold)
    s.le(threshold)
    s.ge(threshold)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.eq(threshold)
    s.ne(threshold)
    s.lt(threshold)
    s.gt(threshold)
    s.le(threshold)
    s.ge(threshold)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_compare",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
