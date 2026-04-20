"""
Benchmark: pandas pd.interval_range() — create an IntervalIndex from start/end with periods.
Mirrors tsb bench_interval_range_fn.ts (intervalRange standalone function).
Outputs JSON: {"function": "interval_range_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 50

for _ in range(WARMUP):
    pd.interval_range(start=0, end=1000, periods=10_000)
    pd.interval_range(start=0, end=100, freq=0.01)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.interval_range(start=0, end=1000, periods=10_000)
    pd.interval_range(start=0, end=100, freq=0.01)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "interval_range_fn",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
