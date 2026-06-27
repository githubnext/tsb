"""Benchmark: notna_boolean — boolean-mask indexing on 100k rows."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE))
mask = pd.Series(np.arange(SIZE) % 2 == 0)
bool_arr = np.arange(SIZE) % 3 != 0

df = pd.DataFrame({
    "a": np.arange(SIZE),
    "b": np.arange(SIZE) * 2,
})

for _ in range(WARMUP):
    s[mask]
    s[~mask]
    df[bool_arr]

start = time.perf_counter()
for _ in range(ITERATIONS):
    s[mask]
    s[~mask]
    df[bool_arr]
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "notna_boolean",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
