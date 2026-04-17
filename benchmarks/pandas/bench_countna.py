"""Benchmark: countna — count NaN/null values in a Series with 10% nulls"""
import json, time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

data = [None if i % 10 == 0 else float(i) for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.isna().sum()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.isna().sum()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "countna",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
