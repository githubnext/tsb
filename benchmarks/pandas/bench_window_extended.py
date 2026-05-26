"""Benchmark: window_extended — rolling sem/skew/kurt/quantile on 100k rows."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20
WINDOW = 10

s = pd.Series(np.sin(np.arange(SIZE) / 100) * 100 + np.arange(SIZE) * 0.001)

for _ in range(WARMUP):
    s.rolling(WINDOW).sem()
    s.rolling(WINDOW).skew()
    s.rolling(WINDOW).kurt()
    s.rolling(WINDOW).quantile(0.5)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.rolling(WINDOW).sem()
    s.rolling(WINDOW).skew()
    s.rolling(WINDOW).kurt()
    s.rolling(WINDOW).quantile(0.5)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "window_extended",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
