"""Benchmark: Series.filter — filter Series index labels by items/like/regex"""
import json
import time
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 10

labels = [f"label_{i}" for i in range(N)]
values = [i * 0.5 for i in range(N)]
s = pd.Series(values, index=labels)

keep_items = [f"label_{i * 100}" for i in range(1_000)]

for _ in range(WARMUP):
    s.filter(items=keep_items)
    s.filter(like="label_5")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.filter(items=keep_items)
    s.filter(like="label_5")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "filter_series",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
