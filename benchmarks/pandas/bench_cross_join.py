"""Benchmark: cross_join — Cartesian product of two 300-row DataFrames (90k result rows)"""
import json
import time
import pandas as pd

N = 300
WARMUP = 3
ITERATIONS = 10

left = pd.DataFrame({
    "id_a": list(range(N)),
    "val_a": [i * 1.5 for i in range(N)],
})
right = pd.DataFrame({
    "id_b": list(range(N)),
    "val_b": [i * 2.5 for i in range(N)],
})

for _ in range(WARMUP):
    pd.merge(left, right, how="cross")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.merge(left, right, how="cross")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "cross_join",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
