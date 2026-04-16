"""Benchmark: EWM.apply with custom function on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS) * 0.05)
s = pd.Series(data)

def weighted_mean(x):
    return x.mean()

for _ in range(WARMUP):
    s.ewm(span=20).apply(weighted_mean, raw=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.ewm(span=20).apply(weighted_mean, raw=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "ewm_apply",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
