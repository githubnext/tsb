"""Benchmark: melt — unpivot a 10k-row DataFrame with 4 value columns"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "id": np.arange(ROWS),
    "a": np.arange(ROWS, dtype=np.float64) * 1.1,
    "b": np.arange(ROWS, dtype=np.float64) * 2.2,
    "c": np.arange(ROWS, dtype=np.float64) * 3.3,
})

for _ in range(WARMUP):
    pd.melt(df, id_vars=["id"], value_vars=["a", "b", "c"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.melt(df, id_vars=["id"], value_vars=["a", "b", "c"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "melt",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
