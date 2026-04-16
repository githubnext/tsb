"""Benchmark: index_insert — Index.insert on 100k-element Index"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE)
idx = pd.Index(labels)

for _ in range(WARMUP):
    idx.insert(500, 999_999)
    idx.insert(0, -1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.insert(500, 999_999)
    idx.insert(0, -1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_insert",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
