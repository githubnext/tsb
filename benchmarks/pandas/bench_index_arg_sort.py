"""Benchmark: index_arg_sort — Index.argsort on 100k-element Index"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE, 0, -1)
idx = pd.Index(labels)

for _ in range(WARMUP):
    idx.argsort()

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.argsort()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_arg_sort",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
