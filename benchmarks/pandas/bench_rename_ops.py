"""Benchmark: rename_ops — rename / add_prefix / add_suffix on Series/DataFrame of 100k rows."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE), index=[f"row_{i}" for i in range(SIZE)])
df = pd.DataFrame({
    "col_a": np.arange(SIZE),
    "col_b": np.arange(SIZE) * 2,
    "col_c": np.arange(SIZE) * 3,
})

for _ in range(WARMUP):
    s.rename(lambda lbl: f"new_{lbl}")
    df.rename(columns={"col_a": "a", "col_b": "b"})
    df.add_prefix("pre_")
    df.add_suffix("_suf")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.rename(lambda lbl: f"new_{lbl}")
    df.rename(columns={"col_a": "a", "col_b": "b"})
    df.add_prefix("pre_")
    df.add_suffix("_suf")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "rename_ops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
