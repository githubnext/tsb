"""Benchmark: DataFrame rolling multi-aggregation on 100k rows"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "a": np.sin(np.arange(ROWS) * 0.01),
    "b": np.cos(np.arange(ROWS) * 0.01),
})

for _ in range(WARMUP):
    df.rolling(10).agg(["mean", "sum"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.rolling(10).agg(["mean", "sum"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_rolling_agg",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
