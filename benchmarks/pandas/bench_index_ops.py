"""Benchmark: Index set operations (union, intersection, difference) on 50k-element Index"""
import json, time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 3
ITERATIONS = 20

labelsA = np.arange(SIZE)
labelsB = np.arange(SIZE // 2, SIZE + SIZE // 2)
idxA = pd.Index(labelsA)
idxB = pd.Index(labelsB)

for _ in range(WARMUP):
    idxA.union(idxB)
    idxA.intersection(idxB)
    idxA.difference(idxB)

start = time.perf_counter()
for _ in range(ITERATIONS):
    idxA.union(idxB)
    idxA.intersection(idxB)
    idxA.difference(idxB)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_ops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
