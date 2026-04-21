"""Benchmark: nunique standalone — count unique values in DataFrame with DataFrame.nunique().
Mirrors tsb bench_nunique_standalone_fn.ts.
"""
import json, time
import pandas as pd
import numpy as np

ROWS = 50_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": np.arange(ROWS) % 1_000,
    "b": [f"cat_{i % 200}" for i in range(ROWS)],
    "c": np.arange(ROWS) % 50,
    "d": [float(i % 100) if i % 5 != 0 else np.nan for i in range(ROWS)],
})

for _ in range(WARMUP):
    df.nunique()
    df.nunique(axis=1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.nunique()
    df.nunique(dropna=False)
    df.nunique(axis=1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "nunique_standalone_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
