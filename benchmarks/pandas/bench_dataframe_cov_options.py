"""Benchmark: DataFrame.cov / DataFrame.corr with options (ddof, min_periods)."""
import json, time
import numpy as np
import pandas as pd

SIZE = 20_000
WARMUP = 3
ITERATIONS = 20

rng = np.random.default_rng(42)
a = np.arange(SIZE) * 0.5 + np.sin(np.arange(SIZE) * 0.01)
b = np.arange(SIZE) * 0.3 - np.cos(np.arange(SIZE) * 0.02)
c = (np.arange(SIZE) % 100) * 1.5
df = pd.DataFrame({"a": a, "b": b, "c": c})

for _ in range(WARMUP):
    df.cov(ddof=0)
    df.cov(ddof=1, min_periods=100)
    df.corr(min_periods=50)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.cov(ddof=0)
    df.cov(ddof=1, min_periods=100)
    df.corr(min_periods=50)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_cov_options",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
