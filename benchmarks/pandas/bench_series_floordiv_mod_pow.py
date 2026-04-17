"""Benchmark: Series floordiv, mod, and pow operators on 100k Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

data = (np.arange(ROWS) + 1) * 0.5
s = pd.Series(data)

for _ in range(WARMUP):
    s.floordiv(3)
    s.mod(7)
    s.pow(2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.floordiv(3)
    s.mod(7)
    s.pow(2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_floordiv_mod_pow",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
