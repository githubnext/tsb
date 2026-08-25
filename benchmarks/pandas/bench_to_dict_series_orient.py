"""
Benchmark: DataFrame.to_dict(orient="series") — converts each column to a pandas Series.

Mirrors tsb toDictOriented(df, "series").

Outputs JSON: {"function": "to_dict_series_orient", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "id": np.arange(ROWS),
    "value": np.arange(ROWS) * 1.5,
    "label": [f"item_{i % 100}" for i in range(ROWS)],
    "score": np.sin(np.arange(ROWS) * 0.01) * 100,
    "flag": np.arange(ROWS) % 2 == 0,
})

for _ in range(WARMUP):
    df.to_dict(orient="series")

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_dict(orient="series")
total = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "to_dict_series_orient",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
