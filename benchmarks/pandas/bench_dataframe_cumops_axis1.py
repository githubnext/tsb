"""
Benchmark: DataFrame.cumsum(axis=1) / cumprod(axis=1) (row-wise) on 10k x 8 DataFrame.
Outputs JSON: {"function": "dataframe_cumops_axis1", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 10_000
COLS = 8
WARMUP = 3
ITERATIONS = 20

data = {f"col{c}": ((np.arange(ROWS) + c) % 10) * 0.1 + 1 for c in range(COLS)}
df = pd.DataFrame(data)

for _ in range(WARMUP):
    df.cumsum(axis=1)
    df.cumprod(axis=1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.cumsum(axis=1)
    df.cumprod(axis=1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "dataframe_cumops_axis1", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
