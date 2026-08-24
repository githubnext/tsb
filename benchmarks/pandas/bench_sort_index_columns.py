"""
Benchmark: DataFrame.sort_index(axis=1) — sort column labels on a 100k-row
DataFrame with many shuffled columns.

Exercises the column-sort code path (axis=1), which is distinct from the
default row-index sort (axis=0) benchmarked elsewhere.

Outputs JSON: {"function": "sort_index_columns", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
N_COLS = 50
WARMUP = 5
ITERATIONS = 30

# Build column names that are intentionally shuffled (z-first alphabetical order)
col_names = [f"col_{str(N_COLS - 1 - i).zfill(3)}" for i in range(N_COLS)]

rng = np.random.default_rng(42)
data = {name: rng.random(ROWS) for name in col_names}
df = pd.DataFrame(data)

# Warm up
for _ in range(WARMUP):
    df.sort_index(axis=1, ascending=True)
    df.sort_index(axis=1, ascending=False)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.sort_index(axis=1, ascending=True)
    df.sort_index(axis=1, ascending=False)
total_s = time.perf_counter() - start
total_ms = total_s * 1000
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "sort_index_columns",
    "mean_ms": round(mean_ms, 4),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 4),
}))
