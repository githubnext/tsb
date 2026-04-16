"""Benchmark: Index.isin on 100k-element Index"""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE)
idx = pd.Index(labels)
lookups = np.arange(0, 1000) * 100

for _ in range(WARMUP):
    for lbl in lookups[:10]:
        lbl in idx
    idx.isin(lookups)

start = time.perf_counter()
for _ in range(ITERATIONS):
    for lbl in lookups[:10]:
        lbl in idx
    idx.isin(lookups)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_contains",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
