"""
Benchmark: DataFrame.map (applymap) — element-wise function on every cell.
Mirrors pandas DataFrame.map / DataFrame.applymap.
Dataset: 50,000 rows × 4 columns of float64.
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 50_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": np.arange(ROWS, dtype=np.float64) * 0.5,
    "b": np.arange(ROWS, dtype=np.float64) * 1.1,
    "c": np.arange(ROWS, dtype=np.float64) * 2.3,
    "d": np.arange(ROWS, dtype=np.float64) * 0.7,
})

fn = lambda v: v * 2.0 + 1.0

# pandas >= 2.1 uses df.map(); older versions use df.applymap()
_map = df.map if hasattr(df, "map") else df.applymap

for _ in range(WARMUP):
    _map(fn)

start = time.perf_counter()
for _ in range(ITERATIONS):
    _map(fn)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "applymap",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
