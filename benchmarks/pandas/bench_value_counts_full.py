"""Benchmark: value_counts_full — value_counts(bins=N) on Series of 100k rows."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

rng = np.random.default_rng(42)
s = pd.Series(rng.random(SIZE) * 100)

for _ in range(WARMUP):
    s.value_counts(bins=10)
    s.value_counts(bins=20)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.value_counts(bins=10)
    s.value_counts(bins=20)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "value_counts_full",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
