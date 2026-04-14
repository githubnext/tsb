"""Benchmark: EWM.cov between two 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data1 = np.sin(np.arange(ROWS) * 0.05)
data2 = np.cos(np.arange(ROWS) * 0.05)
s1 = pd.Series(data1)
s2 = pd.Series(data2)

for _ in range(WARMUP):
    s1.ewm(span=20).cov(s2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s1.ewm(span=20).cov(s2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "ewm_cov",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
