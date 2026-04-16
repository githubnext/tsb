"""Benchmark: Period / PeriodIndex — fixed-frequency time spans."""
import json, time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

base = pd.Period("2020-01-01", freq="D")
periods = [base + i for i in range(SIZE)]

start_q = pd.Period("2000Q1", freq="Q")
end_q = pd.Period("2024Q4", freq="Q")

for _ in range(WARMUP):
    for p in periods[:100]:
        str(p)
        p + 1
    pd.period_range(start=start_q, end=end_q, freq="Q")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for p in periods:
        str(p)
        p + 1
    pd.period_range(start=start_q, end=end_q, freq="Q")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"period","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
