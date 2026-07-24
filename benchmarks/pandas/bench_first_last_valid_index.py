"""
Benchmark: first_valid_index / last_valid_index
Outputs JSON: {"function": "first_last_valid_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

N = 100_000

# Series where first valid is near the start (a few NaN at beginning)
data_start = np.where(np.arange(N) < 10, np.nan, np.arange(N, dtype=float))
series_start = pd.Series(data_start)

# Series where last valid is near the end (a few NaN at the end)
data_end = np.where(np.arange(N) >= N - 10, np.nan, np.arange(N, dtype=float))
series_end = pd.Series(data_end)

# Series with NaN scattered throughout
data_mixed = np.where(np.arange(N) % 7 == 0, np.nan, np.arange(N, dtype=float))
series_mixed = pd.Series(data_mixed)

# Warm-up
for _ in range(20):
    series_start.first_valid_index()
    series_end.last_valid_index()
    series_mixed.first_valid_index()
    series_mixed.last_valid_index()

iterations = 500
start = time.perf_counter()
for _ in range(iterations):
    series_start.first_valid_index()
    series_end.last_valid_index()
    series_mixed.first_valid_index()
    series_mixed.last_valid_index()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "first_last_valid_index",
    "mean_ms": total_ms / iterations,
    "iterations": iterations,
    "total_ms": total_ms,
}))
