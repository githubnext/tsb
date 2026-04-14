"""Benchmark: DataFrame expanding min and max on 100k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

a = np.sin(np.arange(ROWS) * 0.01)
b = np.cos(np.arange(ROWS) * 0.01)
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.expanding().min()
    df.expanding().max()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.expanding().min()
    df.expanding().max()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_expanding_min_max",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
