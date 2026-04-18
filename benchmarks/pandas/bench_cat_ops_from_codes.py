"""
Benchmark: pd.Categorical.from_codes, reorder_categories by freq, ordered categorical on 100k elements.
Outputs JSON: {"function": "cat_ops_from_codes", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

categories = ["alpha", "beta", "gamma", "delta", "epsilon"]
codes = [i % len(categories) for i in range(SIZE)]
order = ["epsilon", "delta", "gamma", "beta", "alpha"]

def cat_from_codes():
    return pd.Categorical.from_codes(codes, categories=categories)

def cat_sort_by_freq(c):
    s = pd.Series(c)
    freq_order = s.value_counts().index.tolist()
    return s.astype(pd.CategoricalDtype(categories=freq_order, ordered=False))

def cat_to_ordinal(c):
    s = pd.Series(c)
    return s.astype(pd.CategoricalDtype(categories=order, ordered=True))

for _ in range(WARMUP):
    c = cat_from_codes()
    cat_sort_by_freq(c)
    cat_to_ordinal(c)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    c = cat_from_codes()
    cat_sort_by_freq(c)
    cat_to_ordinal(c)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "cat_ops_from_codes",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
