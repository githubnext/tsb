"""Benchmark: Series.items() / Series.iteritems() — iterate over (label, value) pairs."""
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(
    data=[i * 1.1 for i in range(SIZE)],
    index=[f"row_{i}" for i in range(SIZE)],
)

for _ in range(WARMUP):
    for _pair in s.items():
        pass

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for _pair in s.items():
        pass
    times.append(time.perf_counter() - t0)

total = sum(times)
mean_ms = (total / ITERATIONS) * 1000
total_ms = total * 1000
print(f'{{"function": "series_items_iter", "mean_ms": {mean_ms:.6f}, "iterations": {ITERATIONS}, "total_ms": {total_ms:.6f}}}')
