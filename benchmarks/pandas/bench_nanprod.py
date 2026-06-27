"""Benchmark: nanprod — product of array values ignoring NaN, via pd.Series.prod()."""
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = [None if i % 13 == 0 else 1 + (i % 7) * 0.0001 for i in range(SIZE)]
s = pd.Series(data, dtype=float)

for _ in range(WARMUP):
    s.prod(skipna=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.prod(skipna=True)
    times.append(time.perf_counter() - t0)

total = sum(times)
mean_ms = (total / ITERATIONS) * 1000
total_ms = total * 1000
print(f'{{"function": "nanprod", "mean_ms": {mean_ms:.6f}, "iterations": {ITERATIONS}, "total_ms": {total_ms:.6f}}}')
