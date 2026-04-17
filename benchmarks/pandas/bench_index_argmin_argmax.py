"""Benchmark: index_argmin_argmax — Index.argmin and Index.argmax on 100k-element Index"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = np.arange(SIZE)
idx = pd.Index(labels)

for _ in range(WARMUP):
    idx.argmin()
    idx.argmax()

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.argmin()
    idx.argmax()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_argmin_argmax",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
