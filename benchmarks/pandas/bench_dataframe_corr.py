"""Benchmark: DataFrame.corr — pairwise Pearson correlation on a 10k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "a": np.sin(np.arange(ROWS) * 0.01),
    "b": np.cos(np.arange(ROWS) * 0.01),
    "c": np.arange(ROWS, dtype=np.float64) * 0.001,
})

for _ in range(WARMUP):
    df.corr()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.corr()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_corr",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
