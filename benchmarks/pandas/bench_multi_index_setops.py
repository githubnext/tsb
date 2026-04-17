"""Benchmark: MultiIndex set operations (union, intersection, difference)"""
import json, time
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 10

a1 = [f"a{i % 100}" for i in range(ROWS)]
b1 = [i % 1000 for i in range(ROWS)]
tuples1 = list(zip(a1, b1))

a2 = [f"a{(i + 50) % 100}" for i in range(ROWS)]
b2 = [(i + 500) % 1000 for i in range(ROWS)]
tuples2 = list(zip(a2, b2))

mi1 = pd.MultiIndex.from_tuples(tuples1)
mi2 = pd.MultiIndex.from_tuples(tuples2)

for _ in range(WARMUP):
    mi1.union(mi2)
    mi1.intersection(mi2)
    mi1.difference(mi2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    mi1.union(mi2)
    mi1.intersection(mi2)
    mi1.difference(mi2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "multi_index_setops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
