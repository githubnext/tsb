"""
Benchmark: pandas Series-to-Series comparison operations.

Mirrors tsb seriesNe(a, b), seriesGt(a, b), seriesLe(a, b), seriesEq(a, b).
The existing compare benchmark tests scalar comparison; this tests Series-to-Series.
Uses 100k-element Series to match the TypeScript benchmark.
"""
import json
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 100

a = pd.Series([(i * 1.7) % 1000 for i in range(SIZE)], dtype=float)
b = pd.Series([(i * 2.3) % 1000 for i in range(SIZE)], dtype=float)

# Warm-up
for _ in range(WARMUP):
    a.ne(b)
    a.gt(b)
    a.le(b)
    a.eq(b)

start = time.perf_counter()
for _ in range(ITERATIONS):
    a.ne(b)
    a.gt(b)
    a.le(b)
    a.eq(b)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_compare_pair",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
