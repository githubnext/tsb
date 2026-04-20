"""
Benchmark: pd.Series.value_counts (freq table) and pd.crosstab for categorical data on 100k elements.
Outputs JSON: {"function": "cat_freq_crosstab", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

cats_a = ["alpha", "beta", "gamma", "delta", "epsilon"]
cats_b = ["north", "south", "east", "west"]
data_a = pd.Categorical([cats_a[i % len(cats_a)] for i in range(SIZE)], categories=cats_a)
data_b = pd.Categorical([cats_b[i % len(cats_b)] for i in range(SIZE)], categories=cats_b)
s_a = pd.Series(data_a)
s_b = pd.Series(data_b)

for _ in range(WARMUP):
    s_a.value_counts(sort=False)
    pd.crosstab(s_a, s_b)
    pd.crosstab(s_a, s_b, normalize=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s_a.value_counts(sort=False)
    pd.crosstab(s_a, s_b)
    pd.crosstab(s_a, s_b, normalize=True)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "cat_freq_crosstab",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
