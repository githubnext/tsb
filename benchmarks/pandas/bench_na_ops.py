"""Benchmark: na_ops — isna / notna / ffill / bfill on 100k rows."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = pd.array([i if i % 5 != 0 else pd.NA for i in range(SIZE)], dtype="Int64")
s = pd.Series(data, dtype="float64")
s[np.arange(SIZE) % 5 == 0] = np.nan

df = pd.DataFrame({
    "a": s,
    "b": pd.Series([float(i * 2) if i % 7 != 0 else np.nan for i in range(SIZE)]),
})

for _ in range(WARMUP):
    pd.isna(s)
    pd.notna(s)
    s.ffill()
    s.bfill()
    df.ffill()
    df.bfill()

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.isna(s)
    pd.notna(s)
    s.ffill()
    s.bfill()
    df.ffill()
    df.bfill()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "na_ops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
