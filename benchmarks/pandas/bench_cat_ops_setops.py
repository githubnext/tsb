"""
Benchmark: categorical union/intersect/diff categories on 100k element Series.
Outputs JSON: {"function": "cat_ops_setops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

cats_a = ["alpha", "beta", "gamma", "delta"]
cats_b = ["gamma", "delta", "epsilon", "zeta"]
data_a = [cats_a[i % len(cats_a)] for i in range(SIZE)]
data_b = [cats_b[i % len(cats_b)] for i in range(SIZE)]
s_a = pd.Series(data_a, dtype="category")
s_b = pd.Series(data_b, dtype="category")

def cat_union(a, b):
    cats = list(dict.fromkeys(list(a.cat.categories) + [c for c in b.cat.categories if c not in a.cat.categories]))
    return a.astype(pd.CategoricalDtype(categories=cats))

def cat_intersect(a, b):
    cats = [c for c in a.cat.categories if c in set(b.cat.categories)]
    return a.astype(pd.CategoricalDtype(categories=cats))

def cat_diff(a, b):
    cats = [c for c in a.cat.categories if c not in set(b.cat.categories)]
    return a.astype(pd.CategoricalDtype(categories=cats))

for _ in range(WARMUP):
    cat_union(s_a, s_b)
    cat_intersect(s_a, s_b)
    cat_diff(s_a, s_b)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    cat_union(s_a, s_b)
    cat_intersect(s_a, s_b)
    cat_diff(s_a, s_b)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "cat_ops_setops",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
