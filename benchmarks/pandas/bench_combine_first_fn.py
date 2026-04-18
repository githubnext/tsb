"""Benchmark: combineFirstSeries standalone — pd.Series.combine_first() on 50k-element Series with 30% NaN."""
import json, time
import pandas as pd
import numpy as np

SIZE = 50_000
WARMUP = 5
ITERATIONS = 30

rng = np.random.default_rng(42)
data1 = rng.standard_normal(SIZE)
data1[::3] = float("nan")  # ~30% nulls
s1 = pd.Series(data1)
s2 = pd.Series(np.arange(SIZE, dtype=np.float64) * 2.0)

for _ in range(WARMUP):
    s1.combine_first(s2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s1.combine_first(s2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "combine_first_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
