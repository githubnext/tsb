"""Benchmark: Series.str.len() on 100k-element string Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [f"item_{i}_value" for i in range(ROWS)]
s = pd.Series(data, name="text")

for _ in range(WARMUP):
    s.str.len()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.len()
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_len", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
