"""Benchmark: DatetimeArray — nullable datetime extension array operations.
N=100_000 elements with ~10% nulls using pandas DatetimeArray.
Tests: from_sequence, year, month, day, isna, notna, fillna.
"""
import json
import time
import pandas as pd
import numpy as np

N = 100_000
WARMUP = 3
ITERATIONS = 50

base = pd.Timestamp("2020-01-01")
raw = [(None if i % 10 == 0 else base + pd.Timedelta(days=i)) for i in range(N)]


def run():
    a = pd.array(raw, dtype="datetime64[ns]")
    _ = a.year
    _ = a.month
    _ = a.day
    _ = pd.isna(a)
    _ = ~pd.isna(a)
    _ = a.fillna(pd.Timestamp("2000-01-01"))


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "datetime_array",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
