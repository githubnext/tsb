"""Benchmark: dataframe_torecords — df.to_dict(orient='records') on a 10k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": np.arange(ROWS),
    "b": np.arange(ROWS, dtype=float) * 2.0,
    "c": np.arange(ROWS) % 100,
    "d": np.arange(ROWS, dtype=float) * 0.5,
    "e": np.arange(ROWS) % 10,
})

for _ in range(WARMUP):
    df.to_dict(orient="records")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_dict(orient="records")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_torecords",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
