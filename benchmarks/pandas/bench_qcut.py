"""Benchmark: pd.qcut() — quantile-based binning."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series([float(i) for i in range(SIZE)])

for _ in range(WARMUP):
    pd.qcut(s, q=10)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.qcut(s, q=10)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"qcut","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
