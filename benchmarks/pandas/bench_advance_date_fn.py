"""
Benchmark: pandas DateOffset arithmetic — advance a date by a frequency.
Mirrors tsb bench_advance_date_fn.ts (advanceDate/parseFreq).
Outputs JSON: {"function": "advance_date_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
from pandas.tseries.offsets import Day, BusinessDay, Hour, MonthBegin, MonthEnd, Week

WARMUP = 5
ITERATIONS = 50

d = pd.Timestamp("2020-01-15")
offsets = [Day(1), Day(2), Hour(1), Hour(3), MonthBegin(1), MonthEnd(1), Week(1), BusinessDay(1)]

for _ in range(WARMUP):
    for off in offsets:
        d + off

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for _ in range(1000):
        for off in offsets:
            d + off
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "advance_date_fn",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
