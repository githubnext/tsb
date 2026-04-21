"""
Benchmark: Timedelta property getters — days, hours, minutes, seconds, microseconds, nanoseconds.
Mirrors tsb Timedelta property accessors.
Outputs JSON: {"function": "timedelta_props", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

WARMUP = 5
ITERATIONS = 100
SIZE = 2_000

deltas = [pd.Timedelta(milliseconds=(i - SIZE // 2) * 3_661) for i in range(SIZE)]

for _ in range(WARMUP):
    for td in deltas[:100]:
        _ = td.days
        _ = td.seconds
        _ = td.microseconds
        _ = td.nanoseconds
        _ = td.total_seconds()
        _ = td.components

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for td in deltas:
        _ = td.days
        _ = td.seconds
        _ = td.microseconds
        _ = td.nanoseconds
        _ = td.total_seconds()
        _ = td.components
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "timedelta_props",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
