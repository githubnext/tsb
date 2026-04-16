"""Benchmark: dt_is_year_start_end — dt.is_year_start and dt.is_year_end on 100k datetime values"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

dates = pd.date_range("2020-01-01", periods=ROWS, freq="D")
s = pd.Series(dates)

for _ in range(WARMUP):
    s.dt.is_year_start
    s.dt.is_year_end

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.dt.is_year_start
    s.dt.is_year_end
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dt_is_year_start_end",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
