"""Benchmark: DataFrame rolling apply with custom function on 10k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 2
ITERATIONS = 5

a = np.sin(np.arange(ROWS) * 0.01)
b = np.cos(np.arange(ROWS) * 0.01)
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.rolling(10).apply(np.sum, raw=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.rolling(10).apply(np.sum, raw=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_rolling_apply",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
