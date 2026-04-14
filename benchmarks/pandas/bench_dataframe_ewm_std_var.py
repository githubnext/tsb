"""Benchmark: DataFrame EWM std and var on 100k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

a = np.sin(np.arange(ROWS) * 0.05)
b = np.cos(np.arange(ROWS) * 0.05)
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.ewm(span=20).std()
    df.ewm(span=20).var()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.ewm(span=20).std()
    df.ewm(span=20).var()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_ewm_std_var",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
