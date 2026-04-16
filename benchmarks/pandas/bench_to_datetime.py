"""Benchmark: pd.to_datetime — parse string/numeric values to datetime."""
import json, time
import pandas as pd
from datetime import datetime, timedelta

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

base = datetime(2020, 1, 1)
date_strings = [(base + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(SIZE)]
timestamps = [int((base + timedelta(days=i)).timestamp() * 1000) for i in range(SIZE)]

for _ in range(WARMUP):
    pd.to_datetime(date_strings)
    pd.to_datetime(timestamps, unit="ms")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.to_datetime(date_strings)
    pd.to_datetime(timestamps, unit="ms")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "to_datetime", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
