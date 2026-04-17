"""Benchmark: Series.pct_change / DataFrame.pct_change with fill_method options."""
import json, time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 30

data = [None if i % 20 == 0 else np.sin(i * 0.01) * 100 + 100 for i in range(SIZE)]
s = pd.Series(data, dtype="float64")

df = pd.DataFrame({
    "a": data,
    "b": [None if i % 15 == 0 else np.cos(i * 0.02) * 50 + 50 for i in range(SIZE)],
})

for _ in range(WARMUP):
    s.pct_change(fill_method="pad")
    s.pct_change(fill_method="bfill")
    s.pct_change(fill_method=None)
    df.pct_change(fill_method="pad", periods=2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.pct_change(fill_method="pad")
    s.pct_change(fill_method="bfill")
    s.pct_change(fill_method=None)
    df.pct_change(fill_method="pad", periods=2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pct_change_fill_method",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
