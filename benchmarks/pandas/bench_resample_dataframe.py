"""
Benchmark: DataFrame resampling with multiple aggregations.

The existing resample benchmark only covers Series. This exercises
df.resample("1h").mean() / .sum() / .min() on a multi-column datetime-indexed DataFrame.
Mirrors tsb resampleDataFrame(df, "H").mean() / .sum() / .min().

Outputs JSON: {"function": "resample_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 3
ITERATIONS = 30

idx = pd.date_range("2020-01-01", periods=SIZE, freq="1min")
rng = np.random.default_rng(42)

df = pd.DataFrame({
    "a": np.sin(np.arange(SIZE) * 0.01) * 50 + 50,
    "b": np.cos(np.arange(SIZE) * 0.02) * 30 + 30,
    "c": (np.arange(SIZE) % 100) * 1.5,
}, index=idx)

for _ in range(WARMUP):
    df.resample("1h").mean()
    df.resample("1h").sum()
    df.resample("1h").min()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.resample("1h").mean()
    df.resample("1h").sum()
    df.resample("1h").min()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "resample_dataframe",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
