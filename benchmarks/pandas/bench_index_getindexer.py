"""Benchmark: index_getindexer — pd.Index.get_indexer(target) on 10k-element Index"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

base_idx = pd.Index(np.arange(ROWS, dtype=float))
target_idx = pd.Index(np.arange(1000, dtype=float) * 10)

for _ in range(WARMUP):
    base_idx.get_indexer(target_idx)

start = time.perf_counter()
for _ in range(ITERATIONS):
    base_idx.get_indexer(target_idx)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_getindexer",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
