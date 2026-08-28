"""Benchmark: ewm (Exponentially Weighted Moving) aggregations on 100k-element pandas Series"""
import json, time, math
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [math.sin(i * 0.01) * 100 + 50 for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.ewm(span=20).mean()
    s.ewm(span=20).std()
    s.ewm(span=20).var()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.ewm(span=20).mean()
    s.ewm(span=20).std()
    s.ewm(span=20).var()
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "ewm", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
