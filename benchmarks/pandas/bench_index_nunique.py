"""Benchmark: index_nunique — Index.nunique on 100k-element Index with 50% unique values"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE) % (SIZE // 2)
idx = pd.Index(labels)

for _ in range(WARMUP):
    idx.nunique()

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.nunique()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_nunique",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
