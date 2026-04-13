"""Benchmark: min-max normalization — scale a 100k-element Series to [0, 1]"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.arange(ROWS, dtype=np.float64) * 3.7 - 50_000
s = pd.Series(data)

def min_max_normalize(s):
    return (s - s.min()) / (s.max() - s.min())

for _ in range(WARMUP):
    min_max_normalize(s)

start = time.perf_counter()
for _ in range(ITERATIONS):
    min_max_normalize(s)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "min_max_normalize",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
