"""Benchmark: IntegerArray — nullable integer extension array operations.
N=100_000 elements with ~10% nulls using pandas IntegerArray.
Tests: from_sequence, sum, mean, min, max, add scalar, fillna.
"""
import json
import time
import numpy as np
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 20

# Build input with ~10% nulls (same pattern as TS version)
raw = [(None if i % 10 == 0 else int((i % 1000) - 500)) for i in range(N)]


def run():
    a = pd.array(raw, dtype="Int32")
    _ = a.sum(skipna=True)
    _ = a.mean(skipna=True)
    _ = a.min(skipna=True)
    _ = a.max(skipna=True)
    _ = a + 1
    _ = a.fillna(0)


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "integer_array",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
