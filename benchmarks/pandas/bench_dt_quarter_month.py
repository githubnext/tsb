"""Benchmark: dt_quarter_month — dt.quarter, dt.is_month_start, dt.is_month_end on 100k datetime values"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

dates = pd.date_range("2024-01-01", periods=ROWS, freq="1D")
s = pd.Series(dates)

for _ in range(WARMUP):
    s.dt.quarter
    s.dt.is_month_start
    s.dt.is_month_end

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.dt.quarter
    s.dt.is_month_start
    s.dt.is_month_end
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dt_quarter_month",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
