"""Benchmark: tz_localize and tz_convert on DatetimeIndex (pandas equivalent)."""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

naive = pd.date_range(start="2024-01-01", periods=SIZE, freq="h")

# Warm-up
for _ in range(WARMUP):
    ny = naive.tz_localize("America/New_York")
    ny.tz_convert("UTC")
    ny.tz_convert("Europe/London")

start = time.perf_counter()
for _ in range(ITERATIONS):
    ny = naive.tz_localize("America/New_York")
    ny.tz_convert("UTC")
    ny.tz_convert("Europe/London")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "datetime_tz",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
