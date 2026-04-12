"""Benchmark: Series.rolling().std() — rolling standard deviation."""
import json, time
import pandas as pd

SIZE = 100_000
WINDOW = 20
WARMUP = 5
ITERATIONS = 50

s = pd.Series([float(i*1.1+0.5) for i in range(SIZE)])

for _ in range(WARMUP):
    s.rolling(WINDOW).std()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.rolling(WINDOW).std()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"rolling_std","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
