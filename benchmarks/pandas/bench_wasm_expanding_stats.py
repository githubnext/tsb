"""
Benchmark: pandas Series.expanding().min() / .max() / .var() / .std() / .median()
on a 10 000-element float64 dataset.

Mirrors bench_wasm_expanding_stats.ts.

Outputs JSON: {"function": "wasm_expanding_stats", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import math

import numpy as np
import pandas as pd

SIZE = 10_000
WARMUP = 3
ITERATIONS = 20

data = pd.Series([math.sin(i * 0.01) * 100 for i in range(SIZE)])
exp = data.expanding(min_periods=1)

for _ in range(WARMUP):
    exp.min()
    exp.max()
    exp.var()
    exp.std()
    exp.median()

start = time.perf_counter()
for _ in range(ITERATIONS):
    exp.min()
    exp.max()
    exp.var()
    exp.std()
    exp.median()
total = (time.perf_counter() - start) * 1000  # ms

print(json.dumps({
    "function": "wasm_expanding_stats",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
