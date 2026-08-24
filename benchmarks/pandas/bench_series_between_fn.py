"""Benchmark: Series.between() with all inclusive modes — both, left, right, neither."""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

s = pd.Series(np.arange(SIZE, dtype=float))

for _ in range(WARMUP):
    s.between(25000.0, 75000.0, inclusive="both")
    s.between(25000.0, 75000.0, inclusive="left")
    s.between(25000.0, 75000.0, inclusive="right")
    s.between(25000.0, 75000.0, inclusive="neither")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.between(25000.0, 75000.0, inclusive="both")
    s.between(25000.0, 75000.0, inclusive="left")
    s.between(25000.0, 75000.0, inclusive="right")
    s.between(25000.0, 75000.0, inclusive="neither")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_between_fn",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
