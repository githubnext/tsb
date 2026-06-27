"""Benchmark: Series.pow, Series.mod, DataFrame.pow on 100k rows"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = (np.arange(ROWS) % 100) + 1
s = pd.Series(data.astype(float))
df = pd.DataFrame({
    "a": ((np.arange(ROWS) % 100) + 1).astype(float),
    "b": ((np.arange(ROWS) % 50) + 1).astype(float),
})

for _ in range(WARMUP):
    s.pow(2)
    s.mod(7)
    df.pow(2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.pow(2)
    s.mod(7)
    df.pow(2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pow_mod",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
