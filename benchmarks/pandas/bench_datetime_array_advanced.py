"""
Benchmark: DatetimeArray advanced accessors — hour, minute, second, microsecond,
dayofweek, dayofyear, quarter, min, max on N=100_000 elements with ~10% nulls.
"""
import json
import time
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 50

base = pd.Timestamp("2020-01-01T12:30:45.123")
raw = [(None if i % 10 == 0 else base + pd.Timedelta(minutes=i)) for i in range(N)]


def run():
    a = pd.array(raw, dtype="datetime64[ns]")
    _ = a.hour
    _ = a.minute
    _ = a.second
    _ = a.microsecond
    _ = a.dayofweek
    _ = a.dayofyear
    _ = a.quarter
    _ = a.min()
    _ = a.max()


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "datetime_array_advanced",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
