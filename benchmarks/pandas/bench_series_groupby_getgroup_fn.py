"""Benchmark: SeriesGroupBy get_group — retrieve specific groups by key.
Mirrors tsb bench_series_groupby_getgroup_fn.ts using pandas SeriesGroupBy.
"""
import json, time
import pandas as pd
import numpy as np

ROWS = 100_000
N_GROUPS = 50
WARMUP = 5
ITERATIONS = 100

keys = [f"group_{i % N_GROUPS}" for i in range(ROWS)]
values = np.arange(ROWS) * 1.5
ser = pd.Series(values)
sgb = ser.groupby(keys)

group_keys = [f"group_{i}" for i in range(N_GROUPS)]

for _ in range(WARMUP):
    for k in group_keys:
        sgb.get_group(k)

start = time.perf_counter()
for _ in range(ITERATIONS):
    for k in group_keys:
        sgb.get_group(k)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_groupby_getgroup_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
