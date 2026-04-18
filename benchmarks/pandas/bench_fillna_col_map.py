"""Benchmark: DataFrame.fillna() with per-column fill dict."""
import json, time, random
import pandas as pd
import numpy as np

ROWS = 50_000
WARMUP = 5
ITERATIONS = 30

random.seed(42)
rng = np.random.default_rng(42)

col_a = np.where(rng.random(ROWS) < 0.2, np.nan, rng.random(ROWS) * 100)
col_b = np.where(rng.random(ROWS) < 0.2, np.nan, rng.random(ROWS) * 50)
col_c = np.where(rng.random(ROWS) < 0.2, np.nan, rng.random(ROWS) * 200)

df = pd.DataFrame({"a": col_a, "b": col_b, "c": col_c})
fill_map = {"a": 0, "b": -1, "c": 99}

for _ in range(WARMUP):
    df.fillna(fill_map)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.fillna(fill_map)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "fillna_col_map",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
