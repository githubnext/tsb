"""Benchmark: SeriesGroupBy.transform on 100k Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = (np.arange(ROWS) * 1.5) % 9999
by = np.arange(ROWS) % 50
s = pd.Series(data)

for _ in range(WARMUP):
    s.groupby(by).transform(lambda x: x - x.mean())

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.groupby(by).transform(lambda x: x - x.mean())
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_groupby_transform",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
