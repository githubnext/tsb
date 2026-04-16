"""Benchmark: index_drop_duplicates — Index.drop_duplicates on 100k Index with 50% dupes"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE) % (SIZE // 2)
idx = pd.Index(labels)

for _ in range(WARMUP):
    idx.drop_duplicates()

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.drop_duplicates()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_drop_duplicates",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
