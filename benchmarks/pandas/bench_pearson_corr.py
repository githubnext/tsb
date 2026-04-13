"""Benchmark: pearsonCorr — Pearson correlation between two 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

x = pd.Series(np.sin(np.arange(ROWS) * 0.01))
y = pd.Series(np.sin(np.arange(ROWS) * 0.01 + 0.5))

for _ in range(WARMUP):
    x.corr(y)

start = time.perf_counter()
for _ in range(ITERATIONS):
    x.corr(y)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pearson_corr",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
