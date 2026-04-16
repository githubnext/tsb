"""Benchmark: expanding apply with custom function on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 2
ITERATIONS = 5

data = np.sin(np.arange(ROWS) * 0.01)
s = pd.Series(data)

def fn(values):
    return values.mean()

for _ in range(WARMUP):
    s.expanding().apply(fn, raw=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.expanding().apply(fn, raw=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "expanding_apply",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
