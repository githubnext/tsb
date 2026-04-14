"""Benchmark: index_isna_dropna — Index.isna and Index.dropna on 100k-element Index with nulls"""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

labels = [None if i % 5 == 0 else i for i in range(SIZE)]
idx = pd.Index(labels)

for _ in range(WARMUP):
    idx.isna()
    idx.dropna()

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.isna()
    idx.dropna()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_isna_dropna",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
