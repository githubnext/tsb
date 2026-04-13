"""Benchmark: to_json — serialize a 10k-row DataFrame to JSON"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "a": np.arange(ROWS, dtype=np.float64) * 1.5,
    "b": np.arange(ROWS, dtype=np.float64) * 2.5,
})

for _ in range(WARMUP):
    df.to_json(orient="records")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_json(orient="records")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "to_json",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
