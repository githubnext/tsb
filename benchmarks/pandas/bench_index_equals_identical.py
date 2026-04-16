"""Benchmark: index_equals_identical — Index.equals and Index.identical on 100k-element Index"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE)
idx = pd.Index(labels)
idx2 = pd.Index(labels.copy())

for _ in range(WARMUP):
    idx.equals(idx2)
    idx.identical(idx2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.equals(idx2)
    idx.identical(idx2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_equals_identical",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
