"""Benchmark: Interval / IntervalIndex — closed/open intervals."""
import json, time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

intervals = [pd.Interval(i, i + 1) for i in range(SIZE)]
breaks = list(range(1_001))

for _ in range(WARMUP):
    for iv in intervals[:100]:
        iv.mid in iv
        _ = iv.length
        str(iv)
    pd.IntervalIndex.from_breaks(breaks)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for iv in intervals:
        iv.mid in iv
        _ = iv.length
        str(iv)
    pd.IntervalIndex.from_breaks(breaks)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"interval","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
