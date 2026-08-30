"""
Benchmark: pandas DatetimeIndex — min(), max(), index access, to_pydatetime(), asi8
on a 10,000-element DatetimeIndex.

Mirrors tsb bench_datetime_index_min_max.ts.

Outputs JSON: {"function": "datetime_index_min_max", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

idx = pd.date_range(start="2000-01-01", periods=SIZE, freq="h")
mid = SIZE // 2

# Warm-up
for _ in range(WARMUP):
    idx.min()
    idx.max()
    _ = idx[mid]
    idx.to_pydatetime()
    idx.asi8

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.min()
    idx.max()
    _ = idx[mid]
    idx.to_pydatetime()
    idx.asi8
total_s = time.perf_counter() - start

total_ms = total_s * 1000
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "datetime_index_min_max",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
