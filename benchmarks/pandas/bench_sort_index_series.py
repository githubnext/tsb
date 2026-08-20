"""Benchmark: Series.sort_index — sort a Series by its index labels.

Mirrors tsb sortIndexSeries.
N=100_000 elements with shuffled string and numeric index labels.
Outputs JSON: {"function": "sort_index_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 20

numeric_data = np.sin(np.arange(N, dtype=float)) * 1000

# Numeric index, shuffled
shuffled_index = np.arange(N - 1, -1, -1)
s_numeric = pd.Series(numeric_data, index=shuffled_index)

# String index, shuffled
string_index = [f"key_{(N - 1 - i):06d}" for i in range(N)]
s_string = pd.Series(numeric_data, index=string_index)

for _ in range(WARMUP):
    s_numeric.sort_index()
    s_numeric.sort_index(ascending=False)
    s_string.sort_index()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s_numeric.sort_index()
    s_numeric.sort_index(ascending=False)
    s_string.sort_index()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "sort_index_series",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
