"""Benchmark: Index.sort_values on 100k-element Index"""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE)[::-1]
idx = pd.Index(labels)

for _ in range(WARMUP):
    idx.sort_values()

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.sort_values()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_sort",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
