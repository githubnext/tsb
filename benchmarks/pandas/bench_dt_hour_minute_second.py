"""Benchmark: dt_hour_minute_second — dt.hour, dt.minute, dt.second on 100k datetime values"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

dates = pd.date_range("2024-01-01", periods=ROWS, freq="1min")
s = pd.Series(dates)

for _ in range(WARMUP):
    s.dt.hour
    s.dt.minute
    s.dt.second

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.dt.hour
    s.dt.minute
    s.dt.second
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dt_hour_minute_second",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
