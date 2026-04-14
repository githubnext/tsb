"""Benchmark: DataFrame.rank on a 10k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

a = np.sin(np.arange(ROWS) * 0.1)
b = np.cos(np.arange(ROWS) * 0.1)
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.rank()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.rank()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_rank",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
