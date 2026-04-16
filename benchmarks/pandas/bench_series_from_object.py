"""Benchmark: pd.Series from dict on 10k-key dict"""
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
obj = {f"key_{i}": i * 1.5 for i in range(ROWS)}

for _ in range(WARMUP):
    pd.Series(obj)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.Series(obj)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "series_from_object", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
