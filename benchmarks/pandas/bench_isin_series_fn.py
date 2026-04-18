"""Benchmark: isin standalone — pd.Series.isin with large and small value sets on 100k-element Series."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series([i % 5000 for i in range(SIZE)])
test_set = list(range(2500))
test_set2 = [100, 200, 300, 400, 500]

for _ in range(WARMUP):
    s.isin(test_set)
    s.isin(test_set2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.isin(test_set)
    s.isin(test_set2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "isin_series_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
