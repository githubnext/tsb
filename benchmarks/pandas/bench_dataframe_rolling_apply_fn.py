"""Benchmark: DataFrame rolling apply with a custom range function per column."""
import json, time
import numpy as np
import pandas as pd

ROWS = 5_000
WINDOW = 10
WARMUP = 3
ITERATIONS = 10

a = np.sin(np.arange(ROWS) * 0.01)
b = np.cos(np.arange(ROWS) * 0.02)
c = (np.arange(ROWS) % 100) * 0.5
df = pd.DataFrame({"a": a, "b": b, "c": c})

range_fn = lambda w: np.max(w) - np.min(w)

for _ in range(WARMUP):
    df.rolling(WINDOW).apply(range_fn, raw=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.rolling(WINDOW).apply(range_fn, raw=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_rolling_apply_fn",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
