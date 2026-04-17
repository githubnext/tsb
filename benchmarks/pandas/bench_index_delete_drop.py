"""Benchmark: index_delete_drop — Index.delete and Index.drop on 100k-element Index"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE)
idx = pd.Index(labels)

for _ in range(WARMUP):
    idx.delete(500)
    idx.drop([100, 200, 300, 400, 500])

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.delete(500)
    idx.drop([100, 200, 300, 400, 500])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_delete_drop",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
