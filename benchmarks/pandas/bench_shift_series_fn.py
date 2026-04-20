"""Benchmark: shiftSeries (standalone) — shift values by 1/−2/5 positions in a 100k-element Series."""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE, dtype=np.float64))

for _ in range(WARMUP):
    s.shift(1)
    s.shift(-2)
    s.shift(5)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.shift(1)
    s.shift(-2)
    s.shift(5)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "shift_series_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
