"""Benchmark: DataFrame.apply with axis=1 (row-wise) on 10k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 2
ITERATIONS = 10

a = np.arange(ROWS) * 0.1
b = np.arange(ROWS) * 0.2
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.apply(lambda row: row.sum(), axis=1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.apply(lambda row: row.sum(), axis=1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_apply_axis1",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
