"""Benchmark: MaskedArray — base nullable array operations via pandas IntegerArray.
N=100_000 elements with ~10% nulls. Tests isna/notna/any-na/getitem/to_numpy/dropna/fillna.
"""
import json
import time
import pandas as pd
import numpy as np

N = 100_000
WARMUP = 3
ITERATIONS = 20

raw = [(None if i % 10 == 0 else int((i % 1000) - 500)) for i in range(N)]


def run():
    a = pd.array(raw, dtype="Int32")
    _ = pd.isna(a)
    _ = pd.notna(a)
    _ = bool(pd.isna(a).any())
    _ = a[42]
    _ = np.asarray(a, dtype=object)
    _ = a.dropna()
    _ = a.fillna(0)


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "masked_array",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
