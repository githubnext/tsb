"""
Benchmark: Series.combine_first() — fill NaN values from another Series (union of indexes).
Mirrors tsb bench_combine_first_series_fn.ts (standalone combineFirstSeries fn).
Outputs JSON: {"function": "combine_first_series_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

rng = np.random.default_rng(42)
raw = rng.uniform(0, 10, SIZE)
mask = rng.integers(0, 4, SIZE) == 0  # ~25% nulls
d1 = pd.array(raw, dtype="Float64")
for idx in range(SIZE):
    if mask[idx]:
        d1[idx] = pd.NA

s1 = pd.Series(d1, dtype="Float64")
s2 = pd.Series(rng.uniform(0, 10, SIZE))

for _ in range(WARMUP):
    s1.combine_first(s2)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s1.combine_first(s2)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "combine_first_series_fn",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
