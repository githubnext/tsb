"""Benchmark: astype standalone — DataFrame.astype with per-column and uniform dtype on 100k-row DataFrame."""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": np.arange(SIZE, dtype=np.float64),
    "b": np.arange(SIZE, dtype=np.int64),
    "c": np.where(np.arange(SIZE) % 2 == 0, 1, 0).astype(np.int64),
})

for _ in range(WARMUP):
    df.astype({"a": "float32", "b": "int32"})
    df.astype("float64")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.astype({"a": "float32", "b": "int32"})
    df.astype("float64")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "astype_df_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
