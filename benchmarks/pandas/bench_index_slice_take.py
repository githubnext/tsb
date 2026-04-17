"""Benchmark: index_slice_take — Index slice and take on 100k-element Index"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE)
idx = pd.Index(labels)
positions = np.arange(0, SIZE, 100)

for _ in range(WARMUP):
    idx[0:50_000]
    idx.take(positions)

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx[0:50_000]
    idx.take(positions)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_slice_take",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
