"""Benchmark: cat_remove_unused — pd.Categorical.remove_unused_categories() on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

cats = ["a", "b", "c"]
data = [cats[i % len(cats)] for i in range(ROWS)]
# Add unused categories
cat_type = pd.CategoricalDtype(categories=["a", "b", "c", "x", "y", "z"])
s = pd.Series(data, dtype=cat_type)

for _ in range(WARMUP):
    s.cat.remove_unused_categories()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.cat.remove_unused_categories()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "cat_remove_unused",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
