"""Benchmark: Series.copy(data=new_data) on 100k-element Series (equivalent to withValues)"""
import json, time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = list(range(ROWS))
new_data = [i * 2.0 for i in range(ROWS)]
s = pd.Series(data, name="x")

for _ in range(WARMUP):
    pd.Series(new_data, index=s.index, name=s.name)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.Series(new_data, index=s.index, name=s.name)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "series_with_values", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
