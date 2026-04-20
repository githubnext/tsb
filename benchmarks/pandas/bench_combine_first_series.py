"""Benchmark: Series.combine_first (standalone equivalent) — fill missing values from another Series.
Mirrors tsb bench_combine_first_series.ts for pandas.
"""
import json, time
import pandas as pd
import numpy as np

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

data1 = [None if i % 3 == 0 else i * 0.5 for i in range(SIZE)]
data2 = [i * 0.1 for i in range(SIZE)]
s1 = pd.Series(data1)
s2 = pd.Series(data2)

for _ in range(WARMUP):
    s1.combine_first(s2)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s1.combine_first(s2)
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
mean = total / ITERATIONS
print(json.dumps({
    "function": "combine_first_series",
    "mean_ms": round(mean, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
