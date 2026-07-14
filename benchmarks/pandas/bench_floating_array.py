"""
Benchmark: FloatingArray (pandas Float64 nullable float array).
N=100_000 elements with ~10% nulls. Tests from/sum/mean/min/max/add/fillna.
"""
import json
import time

import pandas as pd
import numpy as np

N = 100_000
WARMUP = 3
ITERATIONS = 20

raw = [None if i % 10 == 0 else (i % 1000) * 0.001 - 0.5 for i in range(N)]

for _ in range(WARMUP):
    a = pd.array(raw, dtype="Float64")
    float(a.sum())
    float(a.mean())
    float(a.min())
    float(a.max())
    a + 1.0
    a.fillna(0.0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    a = pd.array(raw, dtype="Float64")
    float(a.sum())
    float(a.mean())
    float(a.min())
    float(a.max())
    a + 1.0
    a.fillna(0.0)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "floating_array",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
