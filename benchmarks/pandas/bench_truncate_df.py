"""Benchmark: DataFrame.truncate — slice rows by before/after on 100k-row DataFrame"""
import json
import time
import pandas as pd
import numpy as np

N = 100_000
WARMUP = 3
ITERATIONS = 10

index = list(range(N))
df = pd.DataFrame({
    "a": np.arange(N, dtype=float),
    "b": np.arange(N, dtype=float) * 2,
    "c": np.arange(N, dtype=float) * 3,
}, index=index)

for _ in range(WARMUP):
    df.truncate(before=10_000, after=90_000)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.truncate(before=10_000, after=90_000)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "truncate_df",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
