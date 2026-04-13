"""Benchmark: zscore normalization on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd
from scipy import stats as sp_stats

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

rng = np.random.default_rng(42)
data = rng.random(ROWS) * 100
s = pd.Series(data)

def zscore_pandas(s):
    return (s - s.mean()) / s.std()

for _ in range(WARMUP):
    zscore_pandas(s)

start = time.perf_counter()
for _ in range(ITERATIONS):
    zscore_pandas(s)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "zscore",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
