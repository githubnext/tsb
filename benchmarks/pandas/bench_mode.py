"""Benchmark: mode on 100k-element Series (mixed numeric with repeats)"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

# Same data: values 0..9 cycling so mode is meaningful
data = np.arange(ROWS) % 10
s = pd.Series(data, dtype="float64")

for _ in range(WARMUP):
    s.mode()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.mode()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "mode",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
