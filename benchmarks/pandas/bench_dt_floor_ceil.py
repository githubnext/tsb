"""Benchmark: dt_floor_ceil — dt.floor and dt.ceil on 100k datetime values"""
import json, time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

dates = pd.date_range("2024-01-01", periods=ROWS, freq="1min")
s = pd.Series(dates)

for _ in range(WARMUP):
    s.dt.floor("H")
    s.dt.ceil("H")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.dt.floor("H")
    s.dt.ceil("H")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dt_floor_ceil",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
