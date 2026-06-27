"""Benchmark: resample_first_last — pd.Series.resample("H").first() / .last()."""
import time
import pandas as pd
import numpy as np

SIZE = 50_000
WARMUP = 3
ITERATIONS = 30

base = pd.Timestamp("2020-01-01T00:00:00Z")
idx = pd.date_range(start=base, periods=SIZE, freq="min")
data = [(i % 100) * 2.5 + np.cos(i * 0.01) * 10 for i in range(SIZE)]

s = pd.Series(data, index=idx)

for _ in range(WARMUP):
    s.resample("H").first()
    s.resample("H").last()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.resample("H").first()
    s.resample("H").last()
    times.append(time.perf_counter() - t0)

total = sum(times)
mean_ms = (total / ITERATIONS) * 1000
total_ms = total * 1000
print(f'{{"function": "resample_first_last", "mean_ms": {mean_ms:.6f}, "iterations": {ITERATIONS}, "total_ms": {total_ms:.6f}}}')
