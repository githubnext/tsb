"""Benchmark: Timestamp tz_localize + tz_convert — timezone ops on individual Timestamps.
Mirrors tsb bench_timestamp_tz_ops.ts using pandas Timestamp.
"""
import json, time
import pandas as pd

SIZE = 5_000
WARMUP = 5
ITERATIONS = 50

timestamps = [
    pd.Timestamp(year=2020, month=1 + (i % 12), day=1 + (i % 28), hour=i % 24, minute=i % 60, second=0)
    for i in range(SIZE)
]

for _ in range(WARMUP):
    for ts in timestamps[:100]:
        ts_utc = ts.tz_localize("UTC")
        ts_utc.tz_convert("America/New_York")

start = time.perf_counter()
for _ in range(ITERATIONS):
    for ts in timestamps:
        ts_utc = ts.tz_localize("UTC")
        ts_ny = ts_utc.tz_convert("America/New_York")
        ts_ny.tz_convert("Europe/London")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "timestamp_tz_ops",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
