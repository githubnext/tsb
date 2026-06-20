"""Benchmark: Series.sort_values and DataFrame.sort_values on 100k rows"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS, dtype=float)) * 1000
s = pd.Series(data)
df = pd.DataFrame({
    "a": np.sin(np.arange(ROWS, dtype=float)) * 1000,
    "b": np.cos(np.arange(ROWS, dtype=float)) * 500,
})

for _ in range(WARMUP):
    s.sort_values()
    df.sort_values("a")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.sort_values()
    df.sort_values("a")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "sort_ops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
