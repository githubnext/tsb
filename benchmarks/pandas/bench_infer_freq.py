"""Benchmark: pandas.tseries.frequencies.infer_freq — infer frequency from date arrays."""
import json
import time
import pandas as pd
from pandas.tseries.frequencies import infer_freq

WARMUP = 5
ITERATIONS = 500

# Build DatetimeIndex arrays for various frequencies
date_sets = [
    pd.date_range("2020-01-01", periods=200, freq="ms"),
    pd.date_range("2020-01-01", periods=200, freq="s"),
    pd.date_range("2020-01-01", periods=200, freq="min"),
    pd.date_range("2020-01-01", periods=200, freq="h"),
    pd.date_range("2020-01-01", periods=200, freq="D"),
    pd.date_range("2020-01-01", periods=200, freq="W"),
]

for _ in range(WARMUP):
    for ds in date_sets:
        infer_freq(ds)

start = time.perf_counter()
for _ in range(ITERATIONS):
    for ds in date_sets:
        infer_freq(ds)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "infer_freq", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
