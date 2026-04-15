"""Benchmark: Index.is_monotonic_increasing, is_monotonic_decreasing, is_unique on 100k Index"""
import json, time
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 10
idx_inc = pd.Index(range(N))
idx_dec = pd.Index(range(N, 0, -1))

for _ in range(WARMUP):
    idx_inc.is_monotonic_increasing
    idx_dec.is_monotonic_decreasing
    idx_inc.is_unique

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx_inc.is_monotonic_increasing
    idx_dec.is_monotonic_decreasing
    idx_inc.is_unique
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "index_monotonic", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
