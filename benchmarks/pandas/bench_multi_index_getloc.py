"""Benchmark: MultiIndex.get_loc key lookup"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

a = [f"a{i % 100}" for i in range(ROWS)]
b = [i % 1000 for i in range(ROWS)]
tuples = list(zip(a, b))
mi = pd.MultiIndex.from_tuples(tuples)
key = ("a50", 500)

for _ in range(WARMUP):
    mi.get_loc(key)

start = time.perf_counter()
for _ in range(ITERATIONS):
    mi.get_loc(key)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "multi_index_getloc",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
