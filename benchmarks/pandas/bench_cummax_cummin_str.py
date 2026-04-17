"""
Benchmark: Series.cummax() / cummin() on string Series of 10k elements.
Outputs JSON: {"function": "cummax_cummin_str", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

words = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew"]
data = [words[i % len(words)] for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.cummax()
    s.cummin()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.cummax()
    s.cummin()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "cummax_cummin_str", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
