"""Benchmark: join — index-based left join of two 30k-row DataFrames"""
import json, time
import numpy as np
import pandas as pd

ROWS = 30_000
WARMUP = 3
ITERATIONS = 10

# Build two DataFrames with overlapping index labels
idx_left = [f"k{i}" for i in range(ROWS)]
idx_right = [f"k{i}" for i in range(ROWS // 2)]
val_a = np.arange(ROWS, dtype=np.float64) * 1.5
val_b = np.arange(ROWS // 2, dtype=np.float64) * 2.5

left = pd.DataFrame({"A": val_a}, index=idx_left)
right = pd.DataFrame({"B": val_b}, index=idx_right)

for _ in range(WARMUP):
    left.join(right, how="left")

start = time.perf_counter()
for _ in range(ITERATIONS):
    left.join(right, how="left")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "join",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
