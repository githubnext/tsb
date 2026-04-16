"""Benchmark: Index copy and tolist on 100k-element Index"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

idx = pd.Index(range(ROWS))

for _ in range(WARMUP):
    idx.copy()
    idx.tolist()

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.copy()
    idx.tolist()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_copy_toarray",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
