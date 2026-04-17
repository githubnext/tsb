"""Benchmark: MultiIndex droplevel, reorder_levels, set_names"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

a = [f"a{i % 100}" for i in range(ROWS)]
b = [i % 1000 for i in range(ROWS)]
c = [i % 50 for i in range(ROWS)]
tuples = list(zip(a, b, c))
mi = pd.MultiIndex.from_tuples(tuples, names=["x", "y", "z"])

for _ in range(WARMUP):
    mi.droplevel(0)
    mi.reorder_levels([2, 1, 0])
    mi.set_names(["a", "b", "c"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    mi.droplevel(0)
    mi.reorder_levels([2, 1, 0])
    mi.set_names(["a", "b", "c"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "multi_index_droplevel",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
