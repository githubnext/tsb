"""
Benchmark: Interval closed types — both, neither, left, right endpoint variants.
Tests pandas Interval properties with all 4 closed types.
Outputs JSON: {"function": "interval_closed_types", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 100
SIZE = 1_000

closed_types = ["both", "neither", "left", "right"]
all_intervals = []
for closed in closed_types:
    for i in range(SIZE // 4):
        all_intervals.append(pd.Interval(i, i + 1, closed=closed))

ref = pd.Interval(0, 1, closed="right")

for _ in range(WARMUP):
    for iv in all_intervals[:50]:
        _ = iv.closed
        _ = iv.mid
        _ = iv.length
        _ = (0.5 + all_intervals.index(iv) % (SIZE // 4)) in iv

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for iv in all_intervals:
        _ = iv.closed
        _ = iv.mid
        _ = iv.length
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "interval_closed_types",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
