"""Benchmark: dataframe_setindex — df.set_index(col) on a 10k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "id": np.arange(ROWS),
    "a": np.arange(ROWS, dtype=float) * 2.0,
    "b": np.arange(ROWS) % 100,
})

for _ in range(WARMUP):
    df.set_index("id")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.set_index("id")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_setindex",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
