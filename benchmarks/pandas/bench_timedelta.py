"""Benchmark: Timedelta — construction and arithmetic."""
import json, time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

td1 = pd.Timedelta(days=1, hours=2, minutes=30)
td2 = pd.Timedelta(hours=3, minutes=45, seconds=10)
deltas = [pd.Timedelta(days=i % 365, hours=i % 24) for i in range(SIZE)]

for _ in range(WARMUP):
    for d in deltas:
        d + td1
        d - td2
        _ = d.total_seconds() / 3600
        _ = d.total_seconds()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for d in deltas:
        d + td1
        d - td2
        _ = d.total_seconds() / 3600
        _ = d.total_seconds()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"timedelta","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
