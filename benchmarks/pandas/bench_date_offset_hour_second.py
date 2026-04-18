"""Benchmark: DateOffset Hour and Second — apply operations on 5k dates.
Mirrors tsb bench_date_offset_hour_second.ts for pandas.
"""
import json, time
from datetime import timedelta
import pandas as pd
from pandas.tseries.offsets import Hour, Second

SIZE = 5_000
WARMUP = 5
ITERATIONS = 50

hour = Hour(3)
second = Second(90)
base = pd.Timestamp("2020-01-15 10:00:00", tz="UTC")
dates = [base + timedelta(minutes=i) for i in range(SIZE)]

for _ in range(WARMUP):
    for d in dates[:100]:
        d + hour
        d + second

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for d in dates:
        d + hour
        d + second
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
mean = total / ITERATIONS
print(json.dumps({
    "function": "date_offset_hour_second",
    "mean_ms": round(mean, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
