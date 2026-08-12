"""
Benchmark: cut / qcut — bin continuous data into discrete intervals.

Mirrors tsb cut and qcut.
Tests fixed-bin cut and quantile-based qcut on a 100k-row dataset.
Outputs JSON: {"function": "cut_qcut", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import math
import time

import pandas as pd

N = 100_000
WARMUP = 5
ITERATIONS = 50

# 100k values uniformly in [0, 1000)
data = [(i * 1000) / N + math.sin(i) * 0.5 for i in range(N)]

# Warm-up
for _ in range(WARMUP):
    pd.cut(data, 10)
    pd.qcut(data, 10, duplicates="drop")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.cut(data, 10)
    pd.qcut(data, 10, duplicates="drop")
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "cut_qcut",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
