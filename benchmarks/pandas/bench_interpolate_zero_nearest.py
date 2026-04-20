"""Benchmark: Series.interpolate with zero and nearest methods."""
import json, time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 30

data = [None if i % 7 in (0, 1, 2) else np.sin(i * 0.01) * 100 for i in range(SIZE)]
s = pd.Series(data, dtype="float64")

for _ in range(WARMUP):
    s.interpolate(method="zero")
    s.interpolate(method="nearest")
    s.interpolate(method="linear", limit=2)
    s.interpolate(method="pad", limit=5)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.interpolate(method="zero")
    s.interpolate(method="nearest")
    s.interpolate(method="linear", limit=2)
    s.interpolate(method="pad", limit=5)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "interpolate_zero_nearest",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
