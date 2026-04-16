"""Benchmark: Timestamp — construction and component accessors."""
import json, time
import pandas as pd
from datetime import datetime, timezone, timedelta

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

base = datetime(2020, 1, 1, tzinfo=timezone.utc)
dates = [base + timedelta(days=i) for i in range(SIZE)]

for _ in range(WARMUP):
    for d in dates:
        ts = pd.Timestamp(d)
        _ = ts.year
        _ = ts.month
        _ = ts.dayofweek

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for d in dates:
        ts = pd.Timestamp(d)
        _ = ts.year
        _ = ts.month
        _ = ts.dayofweek
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"timestamp","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
