"""
Benchmark: pandas pd.date_range() — generate date sequences.
Mirrors tsb bench_date_range_fn.ts (dateRange standalone function).
Outputs JSON: {"function": "date_range_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 50

start = "2020-01-01"
end = "2020-12-31"

for _ in range(WARMUP):
    pd.date_range(start=start, end=end, freq="D")
    pd.date_range(start=start, periods=1000, freq="h")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.date_range(start=start, end=end, freq="D")
    pd.date_range(start=start, periods=1000, freq="h")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "date_range_fn",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
