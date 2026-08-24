"""Benchmark: BooleanArray — nullable boolean extension array operations.
N=100_000 elements with ~10% nulls using pandas BooleanArray.
Tests: array creation, any, all, sum, and, or, invert, fillna.
"""
import json
import time
import pandas as pd

N = 100_000
WARMUP = 5
ITERATIONS = 50

# Same pattern as TS version (~10% nulls)
raw = [(None if i % 10 == 0 else bool(i % 3 != 0)) for i in range(N)]
raw2 = [(None if i % 7 == 0 else bool(i % 2 == 0)) for i in range(N)]


def run():
    a = pd.array(raw, dtype="boolean")
    b = pd.array(raw2, dtype="boolean")
    _ = a.any(skipna=True)
    _ = a.all(skipna=True)
    _ = a.sum(skipna=True)
    _ = a & b
    _ = a | b
    _ = ~a
    _ = a.fillna(False)


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "boolean_array",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
