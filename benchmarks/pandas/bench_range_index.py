"""Benchmark: pd.RangeIndex construction, .tolist(), slice, contains on 100k"""
import json, time
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 10

for _ in range(WARMUP):
    r = pd.RangeIndex(N)
    r.tolist()
    r[1000:5000]
    50_000 in r

start = time.perf_counter()
for _ in range(ITERATIONS):
    r = pd.RangeIndex(N)
    r.tolist()
    r[1000:5000]
    50_000 in r
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "range_index", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
