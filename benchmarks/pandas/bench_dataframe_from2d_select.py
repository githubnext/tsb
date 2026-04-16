"""Benchmark: DataFrame from 2D array and column selection"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data2d = np.column_stack([
    np.arange(ROWS, dtype=float),
    np.arange(ROWS, dtype=float) * 2,
    np.arange(ROWS, dtype=float) * 3,
])
cols = ["a", "b", "c"]
df = pd.DataFrame(data2d, columns=cols)

for _ in range(WARMUP):
    pd.DataFrame(data2d, columns=cols)
    df[["a", "c"]]

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.DataFrame(data2d, columns=cols)
    df[["a", "c"]]
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_from2d_select",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
