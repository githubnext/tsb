"""Benchmark: index_min_max — Index.min and Index.max on 100k-element Index"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE)
idx = pd.Index(labels)

for _ in range(WARMUP):
    idx.min()
    idx.max()

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.min()
    idx.max()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_min_max",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
